import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';

/** Unknown route → 404 JSON */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
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
