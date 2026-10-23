import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { isDbConnected } from '../db/connect';
import { HttpError } from '../utils/http-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Extra CSRF protection on top of SameSite cookies:
 *  - requests that change data must come from our own site (or an allowed origin)
 *  - and must send JSON (HTML forms on other sites can't send JSON without permission)
 */
export function protectAgainstCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin) {
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin !== ownOrigin && !env.corsOrigins.includes(origin)) {
      throw new HttpError(403, 'Request blocked: unknown origin.', { code: 'BAD_ORIGIN' });
    }
  }

  const hasBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding');
  if (hasBody && !req.is('application/json')) {
    throw new HttpError(415, 'Send the request body as JSON.', { code: 'JSON_REQUIRED' });
  }
  next();
}

/** Answers 503 for data routes while the database is not connected. */
export function requireDb(_req: Request, _res: Response, next: NextFunction) {
  if (!isDbConnected()) {
    throw new HttpError(503, 'The database is not connected. Check MONGODB_URI in backend/.env.', { code: 'DB_UNAVAILABLE' });
  }
  next();
}

const tooMany = (message: string) => ({ error: message, code: 'RATE_LIMITED' });

/** Brute-force protection: only FAILED logins count towards the limit. */
export function loginLimiter(limit = env.loginRateLimit) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany('Too many failed login attempts. Please wait 15 minutes and try again.')
  });
}

/** Stops scripts from creating thousands of accounts. */
export function signupLimiter(limit = 20) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany('Too many sign-ups from this network. Please try again later.')
  });
}
