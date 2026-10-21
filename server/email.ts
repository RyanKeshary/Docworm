// Email Service & Dynamic SMTP Configuration
// Supports database-persisted SMTP credentials, environment fallbacks, and Ethereal test catchers.

import nodemailer, { type TestAccount, type Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { sql } from './db';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; path?: string; content?: any; cid?: string }>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  isGmail: boolean;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const row = await sql`SELECT value FROM public.app_settings WHERE key = 'email'`;
    if (row.length > 0 && row[0].value) {
      const cfg = typeof row[0].value === 'string' ? JSON.parse(row[0].value) : row[0].value;
      if (cfg && (cfg.host || cfg.user || cfg.auth_user)) {
        const host = cfg.host || 'smtp.gmail.com';
        const isGmail = host.toLowerCase().includes('gmail');
        const port = Number(cfg.port || (isGmail ? 465 : 587));
        return {
          host,
          port,
          secure: Boolean(cfg.secure ?? (port === 465)),
          user: cfg.user || cfg.auth_user || (isGmail ? 'principalsmtp@gmail.com' : ''),
          pass: cfg.pass || cfg.auth_pass || '',
          from: cfg.from || cfg.from_email || (isGmail ? '"Docworm Principal Office" <principalsmtp@gmail.com>' : '"Docworm" <no-reply@slrtce.in>'),
          isGmail,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read email settings from DB, falling back to env:', err);
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const isGmail = host.toLowerCase().includes('gmail');
  const port = Number(process.env.SMTP_PORT || (isGmail ? 465 : 587));
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user: process.env.SMTP_USER || (isGmail ? 'principalsmtp@gmail.com' : ''),
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || (isGmail ? '"Docworm Principal Office" <principalsmtp@gmail.com>' : '"Docworm" <no-reply@slrtce.in>'),
    isGmail,
  };
}

let etherealAccount: TestAccount | null = null;

export async function getTransporter(): Promise<{ transporter: Transporter; from: string }> {
  const cfg = await getSmtpConfig();

  // If user has not provided credentials and host is ethereal or empty, create an ephemeral Ethereal account
  if (!cfg.user && (cfg.host.includes('ethereal') || !cfg.host)) {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('📬 Created Ephemeral Ethereal Mail Catcher:', etherealAccount.user);
    }
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    return { transporter, from: `"Docworm Dev" <${etherealAccount.user}>` };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  return { transporter, from: cfg.from };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmailTemplate({
  title,
  content,
  badgeText,
  badgeColor = '#0284c7',
  badgeBg = '#f0f9ff',
  actionUrl,
  actionText = 'Open in Docworm Portal →',
  footerNote,
}: {
  title: string;
  content: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  actionUrl?: string;
  actionText?: string;
  footerNote?: string;
}): string {
  const formattedContent = content
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f7ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f7ff; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Light Blue Themed) -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.08), 0 8px 10px -6px rgba(2, 132, 199, 0.04); border: 1px solid #bfdbfe;">
          
          <!-- Top Prestigious Light Blue Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 55%, #f0f9ff 100%); padding: 24px 30px; border-top: 4px solid #0284c7; border-bottom: 1.5px solid #bae6fd;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Official College Logo / Monogram -->
                        <td style="width: 52px; vertical-align: middle;">
                          <img src="cid:slrtce_logo" alt="Shree L. R. Tiwari College of Engineering" width="48" height="48" style="display: block; border-radius: 10px; object-fit: contain; background: #ffffff; padding: 3px; border: 1px solid #bae6fd; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.12);" />
                        </td>
                        <td style="padding-left: 14px; vertical-align: middle;">
                          <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.04em; color: #0c4a6e; text-transform: uppercase; line-height: 1.3;">
                            Shree L. R. Tiwari College of Engineering
                          </div>
                          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: #0284c7; text-transform: uppercase; margin-top: 3px;">
                            Office of the Principal • Official Communication
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 30px;">
              ${
                badgeText
                  ? `<div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; border: 1px solid ${badgeColor}33;">
                      ${escapeHtml(badgeText)}
                    </div>`
                  : ''
              }
              <h1 style="margin: 0 0 18px 0; font-size: 21px; font-weight: 800; line-height: 1.35; color: #0c4a6e; letter-spacing: -0.01em;">
                ${escapeHtml(title)}
              </h1>

              <div style="color: #334155; font-size: 15px; line-height: 1.65;">
                ${formattedContent}
              </div>

              ${
                actionUrl
                  ? `<div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e0f2fe;">
                      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); text-align: center;">
                        ${escapeHtml(actionText)}
                      </a>
                    </div>`
                  : ''
              }

              <!-- Principal Sign-off Seal -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e0f2fe;">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 13px; font-weight: 700; color: #0c4a6e;">Dr. Umesh Bhadade</div>
                    <div style="font-size: 12px; color: #0284c7; margin-top: 1px;">Principal & Head of Institution</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Shree L. R. Tiwari College of Engineering (SLRTCE)</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <div style="display: inline-block; padding: 6px 12px; background-color: #f0f7ff; border: 1px dashed #7dd3fc; border-radius: 6px; font-size: 10px; font-weight: 700; color: #0284c7; letter-spacing: 0.05em; text-transform: uppercase;">
                      ✓ Official Dispatch
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Institutional Light Blue Footer -->
          <tr>
            <td style="background-color: #f0f7ff; padding: 22px 30px; border-top: 1px solid #bae6fd; font-size: 11px; color: #475569; line-height: 1.6;">
              <div style="font-weight: 700; color: #0c4a6e; margin-bottom: 3px;">
                Shree L. R. Tiwari College of Engineering
              </div>
              <div>
                Kanakia Park, Near Western Express Highway, Mira Road (East), Dist. Thane, Maharashtra 401107
              </div>
              <div style="margin-top: 8px; color: #64748b;">
                Dispatched via Docworm Institutional Portal • SLRTCE Mira Road
              </div>
              ${
                footerNote
                  ? `<div style="margin-top: 6px; font-style: italic; color: #0369a1;">${escapeHtml(footerNote)}</div>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAnnouncementEmail({
  title,
  body,
  priority = 'Medium',
  audience = 'All Campus Faculty & Staff',
  authorName = 'Dr. Umesh Bhadade (Principal)',
  date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  portalUrl = process.env.APP_URL || 'https://docworm-portal.vercel.app',
}: {
  title: string;
  body: string;
  priority?: string;
  audience?: string;
  authorName?: string;
  date?: string;
  portalUrl?: string;
}): string {
  const p = priority.toLowerCase();
  let badgeColor = '#0284c7';
  let badgeBg = '#e0f2fe';
  let borderHighlight = '#0284c7';

  if (p === 'urgent') {
    badgeColor = '#dc2626';
    badgeBg = '#fef2f2';
    borderHighlight = '#ef4444';
  } else if (p === 'high') {
    badgeColor = '#ea580c';
    badgeBg = '#fff7ed';
    borderHighlight = '#f97316';
  } else if (p === 'low') {
    badgeColor = '#475569';
    badgeBg = '#f8fafc';
    borderHighlight = '#64748b';
  }

  const formattedBody = body
    .split('\n\n')
    .map((par) => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">${escapeHtml(par).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f7ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f7ff; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Light Blue Themed) -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px -5px rgba(2, 132, 199, 0.1), 0 8px 10px -6px rgba(2, 132, 199, 0.04); border: 1px solid #bfdbfe;">
          
          <!-- Top Prestigious Light Blue Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 55%, #f0f9ff 100%); padding: 26px 30px; border-top: 4px solid #0284c7; border-bottom: 1.5px solid #bae6fd;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Official College Logo / Monogram -->
                        <td style="width: 52px; vertical-align: middle;">
                          <img src="cid:slrtce_logo" alt="Shree L. R. Tiwari College of Engineering" width="48" height="48" style="display: block; border-radius: 10px; object-fit: contain; background: #ffffff; padding: 3px; border: 1px solid #bae6fd; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.12);" />
                        </td>
                        <td style="padding-left: 14px; vertical-align: middle;">
                          <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.04em; color: #0c4a6e; text-transform: uppercase; line-height: 1.3;">
                            Shree L. R. Tiwari College of Engineering
                          </div>
                          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: #0284c7; text-transform: uppercase; margin-top: 3px;">
                            Office of the Principal • Official Notice & Broadcast
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metadata Pill Bar -->
          <tr>
            <td style="background-color: #f0f7ff; padding: 12px 30px; border-bottom: 1px solid #e0f2fe;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid ${badgeColor}44;">
                      ● ${escapeHtml(priority)} Priority
                    </span>
                    <span style="display: inline-block; margin-left: 8px; padding: 3px 10px; border-radius: 9999px; background-color: #ffffff; color: #0369a1; font-size: 11px; font-weight: 600; border: 1px solid #bfdbfe;">
                      Audience: ${escapeHtml(audience)}
                    </span>
                  </td>
                  <td align="right" style="font-size: 11px; color: #0284c7; font-weight: 600;">
                    ${escapeHtml(date)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 30px;">
              <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; line-height: 1.35; color: #0c4a6e; letter-spacing: -0.01em;">
                ${escapeHtml(title)}
              </h1>

              <!-- Callout Content Box (Light Blue Themed) -->
              <div style="border-left: 4px solid ${borderHighlight}; background-color: #f8fbff; border-top: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; border-bottom: 1px solid #e0f2fe; padding: 18px 22px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
                ${formattedBody}
              </div>

              <!-- Portal Action Button -->
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e0f2fe;">
                <a href="${portalUrl}/notifications" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); text-align: center;">
                  Open Notice in Docworm Portal →
                </a>
              </div>

              <!-- Principal Sign-off Seal -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; padding-top: 22px; border-top: 1px solid #e0f2fe;">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 14px; font-weight: 700; color: #0c4a6e;">${escapeHtml(authorName)}</div>
                    <div style="font-size: 12px; color: #0284c7; margin-top: 1px;">Principal & Head of Institution</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Shree L. R. Tiwari College of Engineering (SLRTCE)</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <div style="display: inline-block; padding: 6px 12px; background-color: #f0f7ff; border: 1px dashed #7dd3fc; border-radius: 6px; font-size: 10px; font-weight: 700; color: #0284c7; letter-spacing: 0.05em; text-transform: uppercase;">
                      ✓ Authenticated Directive
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Institutional Light Blue Footer -->
          <tr>
            <td style="background-color: #f0f7ff; padding: 22px 30px; border-top: 1px solid #bae6fd; font-size: 11px; color: #475569; line-height: 1.6;">
              <div style="font-weight: 700; color: #0c4a6e; margin-bottom: 3px;">
                Shree L. R. Tiwari College of Engineering
              </div>
              <div>
                Kanakia Park, Near Western Express Highway, Mira Road (East), Dist. Thane, Maharashtra 401107
              </div>
              <div style="margin-top: 8px; color: #64748b;">
                Dispatched via Docworm Institutional Portal • SLRTCE Mira Road
              </div>
              <div style="margin-top: 4px; font-size: 10px; color: #94a3b8;">
                This is an official administrative notice sent to authorized SLRTCE personnel. Recorded under institutional audit logs.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  try {
    const cfg = await getSmtpConfig();
    if (cfg.isGmail && !cfg.pass) {
      return {
        success: false,
        error: `Gmail SMTP requires an App Password for ${cfg.user}. Please enter your 16-character Google App Password in Settings -> SMTP Settings.`,
      };
    }
    const { transporter, from } = await getTransporter();
    const htmlBody = opts.html || renderEmailTemplate({ title: opts.subject, content: opts.text });

    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const attachments = [...(opts.attachments || [])];
    if (fs.existsSync(logoPath) && !attachments.some((a) => a.cid === 'slrtce_logo')) {
      attachments.push({
        filename: 'logo.png',
        path: logoPath,
        cid: 'slrtce_logo',
      });
    }

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      text: opts.text,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log('✉️ Dev Mail Preview URL:', previewUrl);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err) {
    console.error('Email dispatch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

