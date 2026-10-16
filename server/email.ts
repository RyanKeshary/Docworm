// Email Service & Dynamic SMTP Configuration
// Supports database-persisted SMTP credentials, environment fallbacks, and Ethereal test catchers.

import nodemailer from 'nodemailer';
import { sql } from './db';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const row = await sql`SELECT value FROM public.app_settings WHERE key = 'email'`;
    if (row.length > 0 && row[0].value && row[0].value.host) {
      const cfg = row[0].value;
      return {
        host: cfg.host,
        port: Number(cfg.port || 587),
        secure: Boolean(cfg.secure || false),
        user: cfg.user || '',
        pass: cfg.pass || '',
        from: cfg.from || '"Docworm Office" <office@slrtce.in>',
      };
    }
  } catch (err) {
    console.warn('Could not read email settings from DB, falling back to env:', err);
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '"Docworm Office" <office@slrtce.in>',
  };
}

let etherealAccount: nodemailer.TestAccount | null = null;

export async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string }> {
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

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  try {
    const { transporter, from } = await getTransporter();
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">${opts.text.replace(/\n/g, '<br/>')}</div>`,
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
