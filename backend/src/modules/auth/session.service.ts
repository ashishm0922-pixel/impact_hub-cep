import type { CookieOptions, Request, Response } from 'express';
import type { Types } from 'mongoose';
import { env } from '../../config/env';
import { SessionModel } from '../../models/session.model';
import { hashToken, newSessionToken } from '../../utils/tokens';

export type SessionKind = 'user' | 'admin';

/**
 * Two separate cookies so a user session and an admin session never mix.
 * The admin cookie is only sent to /api/admin/* (path restriction).
 */
export const COOKIE = {
  user: { name: 'hc_session', path: '/' },
  admin: { name: 'hc_admin_session', path: '/api/admin' }
} as const;

function lifetimeMs(kind: SessionKind) {
  return kind === 'admin' ? env.adminSessionHours * 60 * 60 * 1000 : env.userSessionDays * 24 * 60 * 60 * 1000;
}

function cookieOptions(kind: SessionKind): CookieOptions {
  return {
    httpOnly: true, // JavaScript in the page can't read it → XSS can't steal the session
    secure: env.isProduction, // HTTPS-only in production
    sameSite: 'lax', // not sent on cross-site POSTs → protects against CSRF
    path: COOKIE[kind].path
  };
}

/** Creates a session in the DB and sets the cookie on the response. */
export async function startSession(kind: SessionKind, subjectId: Types.ObjectId, req: Request, res: Response) {
  const token = newSessionToken();
  const maxAge = lifetimeMs(kind);
  await SessionModel.create({
    tokenHash: hashToken(token),
    kind,
    subjectId,
    expiresAt: new Date(Date.now() + maxAge),
    userAgent: req.get('user-agent')?.slice(0, 300),
    ip: req.ip
  });
  res.cookie(COOKIE[kind].name, token, { ...cookieOptions(kind), maxAge });
}

/** Returns the valid session for this request's cookie, or null. */
export async function findSession(kind: SessionKind, req: Request) {
  const token: unknown = req.cookies?.[COOKIE[kind].name];
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;

  const session = await SessionModel.findOne({ tokenHash: hashToken(token), kind });
  // MongoDB's TTL cleanup runs about once a minute, so also check the time ourselves
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

/** Logs out this device: deletes the session and clears the cookie. */
export async function endSession(kind: SessionKind, req: Request, res: Response) {
  const token: unknown = req.cookies?.[COOKIE[kind].name];
  if (typeof token === 'string') await SessionModel.deleteOne({ tokenHash: hashToken(token), kind });
  clearSessionCookie(kind, res);
}

export function clearSessionCookie(kind: SessionKind, res: Response) {
  res.clearCookie(COOKIE[kind].name, cookieOptions(kind));
}

/** Logs a user/admin out everywhere (e.g. when an admin suspends the account). */
export async function endAllSessions(kind: SessionKind, subjectId: Types.ObjectId | string) {
  await SessionModel.deleteMany({ kind, subjectId });
}
