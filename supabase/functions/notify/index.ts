// Docworm notify edge function. Invoked by the app after a notification row is created.
// Sends email via Resend when RESEND_API_KEY is set, otherwise just logs.
// Deploy with: supabase functions deploy notify --project-ref <ref>
// Secrets: supabase secrets set RESEND_API_KEY=... MAIL_FROM="Docworm <office@slrtce.in>"

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400, headers: cors });
    }
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: n, error } = await sb
      .from('docworm_notifications')
      .select('id,title,body,link,user_id,docworm_profiles!inner(email,name)')
      .eq('id', notification_id)
      .single();
    if (error || !n) {
      return new Response(JSON.stringify({ error: 'notification not found' }), { status: 404, headers: cors });
    }
    const profile = n.docworm_profiles as unknown as { email: string; name: string };
    const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const from = Deno.env.get('MAIL_FROM') ?? 'Docworm <office@slrtce.in>';
    const appUrl = Deno.env.get('APP_URL') ?? '';
    if (!apiKey) {
      console.log(`notify (no RESEND_API_KEY): to=${profile.email} title=${n.title}`);
      return new Response(JSON.stringify({ emailed: false, reason: 'no provider key' }), { headers: cors });
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [profile.email],
        subject: `Docworm: ${n.title}`,
        text: `Hello ${profile.name},\n\n${n.title}\n${n.body}\n\nOpen Docworm: ${appUrl}${n.link}\n\nThis is an automated message from the SLRTCE permission system.`,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('resend failed', t);
      return new Response(JSON.stringify({ emailed: false, error: t }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ emailed: true }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'notify failed' }), { status: 500, headers: cors });
  }
});
