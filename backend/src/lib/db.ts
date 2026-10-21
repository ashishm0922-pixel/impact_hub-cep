import { PrismaClient } from '@prisma/client';

/**
 * One shared Prisma client for the whole app.
 * If DATABASE_URL is not set, `prisma` is null and routes answer 503,
 * so the server (and /api/health) still starts during early development.
 */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const prisma: PrismaClient | null = isDatabaseConfigured ? new PrismaClient() : null;
