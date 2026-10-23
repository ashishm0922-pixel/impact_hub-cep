import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError, type FieldError } from '../utils/http-error';

/** Unknown route → 404 JSON */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found.', code: 'NOT_FOUND' });
}

// Friendly messages when a unique field is already taken
const DUPLICATE_MESSAGES: Record<string, string> = {
  email: 'An account with this email already exists.',
  phone: 'An account with this mobile number already exists.',
  username: 'This username is already taken.',
  name: 'A record with this name already exists.'
};

/**
 * Last middleware: turns any error into one consistent JSON shape:
 *   { error: "message", code?: "MACHINE_CODE", fields?: [{ field, message }] }
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Invalid input (zod) → one message per field
  if (err instanceof ZodError) {
    const fields: FieldError[] = [];
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'form';
      if (!fields.some(f => f.field === field)) fields.push({ field, message: issue.message });
    }
    return res.status(400).json({ error: fields[0]?.message || 'Invalid input.', code: 'VALIDATION_ERROR', fields });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, fields: err.fields });
  }

  // MongoDB unique index violation (e.g. two sign-ups with the same email at the same moment)
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    const field = Object.keys((err as { keyPattern?: object }).keyPattern || {})[0] || 'form';
    const message = DUPLICATE_MESSAGES[field] || 'This record already exists.';
    return res.status(409).json({ error: message, code: 'DUPLICATE', fields: [{ field, message }] });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: 'Invalid id.', code: 'INVALID_ID' });
  }

  // Broken JSON or a body that is too large (from express.json())
  const type = (err as { type?: string })?.type;
  if (type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.', code: 'INVALID_JSON' });
  }
  if (type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.', code: 'TOO_LARGE' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.', code: 'SERVER_ERROR' });
}
