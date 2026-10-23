import { AdminModel } from '../../models/admin.model';
import { HttpError } from '../../utils/http-error';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../utils/password';
import { endAllSessions } from '../auth/session.service';
import { USERNAME_REGEX, adminPasswordSchema } from './admin.schemas';

/** Checks that a username/password pair is acceptable for an admin account. */
export function validateAdminCredentials(username: string, password: string) {
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('ADMIN_USERNAME must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.');
  }
  const result = adminPasswordSchema.safeParse(password);
  if (!result.success) throw new Error(result.error.issues[0].message);
}

/**
 * Creates the admin if it doesn't exist. With reset=true, also replaces the password
 * of an existing admin (and logs that admin out everywhere).
 * Returns 'created' | 'reset' | 'exists'.
 */
export async function upsertAdmin(username: string, password: string, reset = false) {
  username = username.trim().toLowerCase();
  validateAdminCredentials(username, password);

  const existing = await AdminModel.findOne({ username });
  if (!existing) {
    await AdminModel.create({ username, passwordHash: await hashPassword(password) });
    return 'created' as const;
  }
  if (!reset) return 'exists' as const;

  existing.passwordHash = await hashPassword(password);
  await existing.save();
  await endAllSessions('admin', existing._id);
  return 'reset' as const;
}

/** True if this admin exists and the password is correct (used for the startup check). */
export async function adminPasswordMatches(username: string, password: string) {
  const admin = await AdminModel.findOne({ username: username.trim().toLowerCase() }).select('+passwordHash');
  return Boolean(admin && (await verifyPassword(password, admin.passwordHash)));
}

export async function authenticateAdmin(username: string, password: string) {
  const admin = await AdminModel.findOne({ username }).select('+passwordHash');
  if (!admin) {
    await verifyAgainstDummy(password);
    throw new HttpError(401, 'Incorrect username or password.', { code: 'INVALID_CREDENTIALS' });
  }
  if (!(await verifyPassword(password, admin.passwordHash))) {
    throw new HttpError(401, 'Incorrect username or password.', { code: 'INVALID_CREDENTIALS' });
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  return admin;
}
