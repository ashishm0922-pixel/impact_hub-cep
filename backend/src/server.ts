import 'dotenv/config'; // must be first: loads backend/.env before config/env.ts reads it
import { createApp } from './app';
import { env } from './config/env';
import { isDatabaseConfigured } from './lib/prisma';

createApp().listen(env.port, () => {
  console.log(`HopeConnect API listening on http://localhost:${env.port}/api/health`);
  if (!isDatabaseConfigured) {
    console.warn('DATABASE_URL is not set: data routes will answer 503 until you configure PostgreSQL.');
  }
});
