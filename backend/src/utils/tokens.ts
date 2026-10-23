import { createHash, randomBytes } from 'node:crypto';

/** A long random session token (256 bits). Sent to the browser in an httpOnly cookie. */
export function newSessionToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * We store only the SHA-256 hash of each token in the database.
 * If the database ever leaked, the stolen values could not be used as cookies.
 */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
