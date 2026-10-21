import 'dotenv/config';
import { createApp } from './app';
import { isDatabaseConfigured } from './lib/db';

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, () => {
  console.log(`HopeConnect API listening on http://localhost:${port}/api/health`);
  if (!isDatabaseConfigured) {
    console.warn('DATABASE_URL is not set: data routes will answer 503 until you configure PostgreSQL.');
  }
});
