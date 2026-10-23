import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing with scrypt (built into Node.js — no extra package).
 * Stored format:  scrypt$N$r$p$<salt base64>$<hash base64>
 * We never store or log the plain password.
 */
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEMORY });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: MAX_MEMORY
  });
  // Constant-time comparison so attackers can't learn anything from response timing
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * When a login uses an email/phone that doesn't exist, we still run one hash check
 * against this dummy value. That makes "no such user" and "wrong password" take the
 * same time, so the response time doesn't reveal which accounts exist.
 */
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword('dummy-password-for-timing-only-1');
  await verifyPassword(password, await dummyHash);
}
