/**
 * Sends ONE test email using the SMTP settings in backend/.env, and explains any error.
 *   npm run email:test                      → sends to SMTP_USER (yourself)
 *   npm run email:test -- someone@mail.com  → sends to that address
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

async function main() {
  if (!env.smtp.host) {
    throw new Error('SMTP_HOST is empty in backend/.env. Fill in the SMTP_* lines first (see README).');
  }
  const to = process.argv[2] || env.smtp.user;
  if (!to) throw new Error('No recipient: set SMTP_USER or pass an address: npm run email:test -- you@mail.com');

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
  });

  console.log(`Checking login to ${env.smtp.host}:${env.smtp.port} as ${env.smtp.user || '(no user)'}...`);
  await transporter.verify();
  console.log('✔ SMTP login OK');

  const info = await transporter.sendMail({
    from: env.mailFrom,
    to,
    subject: 'HopeConnect test email',
    text: 'If you can read this, HopeConnect can send emails. 🎉'
  });
  console.log(`✔ Test email sent to ${to} (id: ${info.messageId}). Check the inbox and the spam folder.`);
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n✖ ${msg}`);
  if (/535|Username and Password not accepted|Invalid login|BadCredentials/i.test(msg)) {
    console.error('  → Wrong SMTP_USER / SMTP_PASS. For Gmail, SMTP_PASS must be a 16-letter APP PASSWORD, not your normal password.');
  } else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
    console.error('  → Cannot reach the mail server. Check SMTP_HOST/SMTP_PORT, or your network/antivirus may block port 587.');
  }
  process.exitCode = 1;
});
