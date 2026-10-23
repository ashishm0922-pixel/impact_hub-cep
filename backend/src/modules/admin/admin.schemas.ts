import { z } from 'zod';
import { USER_STATUSES } from '../../models/user.model';

export const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;

export const adminLoginSchema = z.object({
  username: z
    .string({ required_error: 'Enter your username.' })
    .trim()
    .toLowerCase()
    .min(1, 'Enter your username.')
    .max(32, 'Incorrect username or password.'),
  password: z
    .string({ required_error: 'Enter your password.' })
    .min(1, 'Enter your password.')
    .max(128, 'Incorrect username or password.')
});

// Admin passwords must be stronger than user passwords
export const adminPasswordSchema = z
  .string()
  .min(12, 'Admin password must be at least 12 characters.')
  .max(128, 'Admin password must be at most 128 characters.')
  .regex(/[a-z]/, 'Admin password needs a lowercase letter.')
  .regex(/[A-Z]/, 'Admin password needs an uppercase letter.')
  .regex(/\d/, 'Admin password needs a number.')
  .regex(/[^A-Za-z0-9]/, 'Admin password needs a symbol.');

export const listUsersQuerySchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1)
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended'], {
    errorMap: () => ({ message: 'Status must be approved, rejected or suspended.' })
  }),
  reason: z.string().trim().max(200, 'Reason must be at most 200 characters.').optional(),
  // Required for reject/suspend (checked in the route)
  adminPassword: z.string().max(128).optional()
});
