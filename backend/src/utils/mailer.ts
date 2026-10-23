import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** 'sent' = really delivered to the mail server; 'console' = only printed in the terminal */
export type Delivery = 'sent' | 'console';

/** In tests, sent emails are collected here instead of being delivered. */
export const testOutbox: MailMessage[] = [];

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 465 = SSL; 587 = STARTTLS
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
    });
  }
  return transporter;
}

export function isEmailConfigured() {
  return Boolean(env.smtp.host);
}

/**
 * Sends an email and says how it was delivered.
 *  - tests:              stored in testOutbox
 *  - no SMTP configured: printed in the terminal → 'console' (nothing reaches the inbox!)
 *  - SMTP configured:    really sent → 'sent'
 */
export async function sendMail(message: MailMessage): Promise<Delivery> {
  if (process.env.NODE_ENV === 'test') {
    testOutbox.push(message);
    return isEmailConfigured() ? 'sent' : 'console';
  }
  if (!isEmailConfigured()) {
    const line = '-'.repeat(62);
    console.warn(
      `\n${line}\nEMAIL NOT SENT (SMTP is not configured in backend/.env)\n` +
      `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n${line}\n`
    );
    return 'console';
  }
  await getTransporter().sendMail({ from: env.mailFrom, ...message });
  return 'sent';
}

/** Escape text before putting it into an HTML email. */
export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}
