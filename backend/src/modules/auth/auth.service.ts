import { env } from '../../config/env';
import { UserModel, type UserDocument } from '../../models/user.model';
import { HttpError, type FieldError } from '../../utils/http-error';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../utils/password';
import type { LoginInput, SignupInput } from './auth.schemas';
import { sendVerificationEmail } from './email-verification.service';

/** The only user fields ever sent to the browser. */
export function publicUser(user: UserDocument) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt
  };
}

/**
 * Creates a new account and emails a verification link.
 * The user can log in straight away (unless REQUIRE_ADMIN_APPROVAL=true).
 */
export async function registerUser(input: SignupInput) {
  // Check email AND phone up front so the form can show both problems at once
  const existing = await UserModel.find({ $or: [{ email: input.email }, { phone: input.phone }] })
    .select('email phone')
    .lean();
  const fields: FieldError[] = [];
  if (existing.some(u => u.email === input.email)) {
    fields.push({ field: 'email', message: 'An account with this email already exists.' });
  }
  if (existing.some(u => u.phone === input.phone)) {
    fields.push({ field: 'phone', message: 'An account with this mobile number already exists.' });
  }
  if (fields.length) throw new HttpError(409, fields[0].message, { code: 'DUPLICATE', fields });

  // (If two identical sign-ups race past the check above, the unique index still stops the second one.)
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    status: env.requireAdminApproval ? 'pending' : 'approved'
  });

  // If the email can't be sent right now, sign-up still succeeds: the user can press "Resend" later
  let emailSent = true;
  try {
    emailSent = (await sendVerificationEmail(user)) === 'sent';
  } catch (err) {
    emailSent = false;
    console.error('Could not send verification email:', err instanceof Error ? err.message : err);
  }
  return { user, emailSent };
}

const INVALID_LOGIN = 'Incorrect email/mobile number or password.';

/** Checks the credentials and the account status. Returns the user if they may log in. */
export async function authenticateUser(input: LoginInput) {
  const query = 'email' in input ? { email: input.email } : { phone: input.phone };
  const user = await UserModel.findOne(query).select('+passwordHash');

  if (!user) {
    await verifyAgainstDummy(input.password); // same timing as a real check
    throw new HttpError(401, INVALID_LOGIN, { code: 'INVALID_CREDENTIALS' });
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, INVALID_LOGIN, { code: 'INVALID_CREDENTIALS' });
  }

  // Status is revealed only AFTER the correct password, so it can't be used to probe accounts
  // Accounts created while admin approval was required become active
  // automatically once approval is switched off
  if (user.status === 'pending' && !env.requireAdminApproval) {
    user.status = 'approved';
  }

  switch (user.status) {
    case 'approved':
      break;
    case 'pending':
      throw new HttpError(403, 'Your account is waiting for admin approval. You can log in once it is approved.', {
        code: 'ACCOUNT_PENDING'
      });
    case 'rejected':
      throw new HttpError(403, `Your sign-up was not approved.${user.statusReason ? ` Reason: ${user.statusReason}` : ''}`, {
        code: 'ACCOUNT_REJECTED'
      });
    case 'suspended':
      throw new HttpError(403, `Your account has been suspended.${user.statusReason ? ` Reason: ${user.statusReason}` : ''} Please contact support.`, {
        code: 'ACCOUNT_SUSPENDED'
      });
    default:
      throw new HttpError(403, 'This account cannot log in.', { code: 'ACCOUNT_BLOCKED' });
  }

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}
