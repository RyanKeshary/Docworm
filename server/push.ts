// Browser Web Push Service (VAPID)
// Supports W3C Web Push, subscription storage, and automatic dead endpoint pruning.

import webpush from 'web-push';
import { sql } from './db';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:office@slrtce.in';

let isConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
  } catch (err) {
    console.error('Failed to configure VAPID details for Web Push:', err);
  }
}

export function isPushConfigured(): boolean {
  return isConfigured;
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!isConfigured) return false;

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // If endpoint is expired or unsubscribed (HTTP 404 or 410), prune it
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`Pruning expired push subscription (${sub.id})...`);
      try {
        await sql`DELETE FROM public.push_subscriptions WHERE id = ${sub.id}`;
      } catch (deleteErr) {
        console.error('Failed to prune dead subscription:', deleteErr);
      }
    } else {
      console.error('Web Push delivery error:', err.statusCode, err.message);
    }
    return false;
  }
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!isConfigured || userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  try {
    const subs = await sql`
      SELECT id, user_id, endpoint, p256dh, auth
      FROM public.push_subscriptions
      WHERE user_id IN ${sql(userIds)}
    `;

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        const ok = await sendPushToSubscription(
          { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );
        if (ok) sent++;
        else failed++;
      })
    );

    return { sent, failed };
  } catch (err) {
    console.error('Failed to broadcast push to users:', err);
    return { sent: 0, failed: userIds.length };
  }
}
