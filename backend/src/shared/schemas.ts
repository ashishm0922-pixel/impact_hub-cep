import { z } from 'zod';

/**
 * Validation rules shared by several modules.
 * The SAME rules are used in the browser (frontend/assets/js/core/app.js → HC.validators),
 * so users see the same messages before and after submitting.
 */

const requiredString = (label: string) =>
  z.string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` });

export const nameSchema = requiredString('Full name')
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(60, 'Name must be at most 60 characters.')
  .regex(/^[\p{L}][\p{L} .'-]*$/u, 'Name can only contain letters, spaces, dots, hyphens and apostrophes.');

export const emailSchema = requiredString('Email')
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

// Indian mobile number: exactly 10 digits, first digit 6–9. No +91, spaces or dashes.
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const phoneSchema = requiredString('Mobile number')
  .trim()
  .regex(/^\d+$/, 'Mobile number must contain digits only.')
  .length(10, 'Mobile number must be exactly 10 digits.')
  .regex(PHONE_REGEX, 'Mobile number must start with 6, 7, 8 or 9.');

export const passwordSchema = requiredString('Password')
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/\d/, 'Password must include at least one number.')
  .refine(value => value.trim() === value, 'Password cannot start or end with a space.');

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.');

/** Escape text before using it inside a MongoDB $regex (prevents regex injection). */
export function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
