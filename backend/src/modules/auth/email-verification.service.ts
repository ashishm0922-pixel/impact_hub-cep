import { env } from '../../config/env';
import { EmailTokenModel } from '../../models/email-token.model';
import { UserModel, type UserDocument } from '../../models/user.model';
import { HttpError } from '../../utils/http-error';
import { escapeHtml, sendMail, type Delivery } from '../../utils/mailer';
import { hashToken, newSessionToken } from '../../utils/tokens';

/**
 * Creates a fresh one-time link and emails it to the user.
 * Any older links for this user stop working (only the newest link is valid).
 */
export async function sendVerificationEmail(user: UserDocument): Promise<Delivery> {
  const token = newSessionToken(); // 256-bit random value
  await EmailTokenModel.deleteMany({ user: user._id, purpose: 'verify-email' });
  await EmailTokenModel.create({
    tokenHash: hashToken(token),
    user: user._id,
    purpose: 'verify-email',
    email: user.email,
    expiresAt: new Date(Date.now() + env.verifyEmailHours * 60 * 60 * 1000)
  });

  const link = `${env.appUrl}/pages/verify-email.html?token=${encodeURIComponent(token)}`;
  const name = user.name.split(' ')[0];

  return sendMail({
    to: user.email,
    subject: 'Verify your email for HopeConnect',
    text:
      `Hi ${name},\n\n` +
      `Please confirm your email address by opening this link:\n${link}\n\n` +
      `The link works once and expires in ${env.verifyEmailHours} hours.\n` +
      `If you didn't create a HopeConnect account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #243038;">
        <h2 style="color: #243038;">Verify your email</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for joining HopeConnect. Please confirm your email address:</p>
        <p style="margin: 28px 0;">
          <a href="${escapeHtml(link)}" style="background: #E9B949; color: #243038; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: bold;">
            Verify my email
          </a>
        </p>
        <p style="font-size: 13px; color: #5C6B73;">Or copy this link into your browser:<br>${escapeHtml(link)}</p>
        <p style="font-size: 13px; color: #5C6B73;">The link works once and expires in ${env.verifyEmailHours} hours.
        If you didn't create a HopeConnect account, you can ignore this email.</p>
      </div>`
  });
}

/** Checks the token from the link and marks the email as verified. */
export async function verifyEmailToken(token: string) {
  const record = await EmailTokenModel.findOneAndDelete({ tokenHash: hashToken(token), purpose: 'verify-email' });

  // Not found = wrong, already used, or replaced by a newer link
  if (!record) {
    throw new HttpError(400, 'This verification link is invalid or has already been used. Log in and request a new one.', {
      code: 'TOKEN_INVALID'
    });
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, 'This verification link has expired. Log in and request a new one.', { code: 'TOKEN_EXPIRED' });
  }

  const user = await UserModel.findById(record.user);
  // The link only counts for the address it was sent to
  if (!user || user.email !== record.email) {
    throw new HttpError(400, 'This verification link is no longer valid.', { code: 'TOKEN_INVALID' });
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
  }
  return user;
}
