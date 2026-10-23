import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

/**
 * One shared Prisma client for the whole app.
 * If DATABASE_URL is not set, `prisma` is null and data routes answer 503,
 * so the server (and /api/health) still starts during early development.
 */
export const isDatabaseConfigured = Boolean(env.databaseUrl);

export const prisma: PrismaClient | null = isDatabaseConfigured ? new PrismaClient() : null;

/** Returns the Prisma client, or throws a 503 when no database is configured. */
export function requireDb(): PrismaClient {
  if (!prisma) {
    throw new HttpError(503, 'Database not configured. Set DATABASE_URL in backend/.env (see README).');
  }
  return prisma;
}
