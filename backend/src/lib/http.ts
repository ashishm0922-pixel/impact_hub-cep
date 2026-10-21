import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { prisma } from './db';

/** An error with an HTTP status code, e.g. throw new HttpError(404, 'NGO not found') */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Returns the Prisma client, or throws a 503 when no database is configured. */
export function requireDb() {
  if (!prisma) {
    throw new HttpError(503, 'Database not configured. Set DATABASE_URL in backend/.env (see README).');
  }
  return prisma;
}

/** Last middleware: turns any thrown error into a clean JSON response. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Prisma "unique constraint failed"
  if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side.' });
}
