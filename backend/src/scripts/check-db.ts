/**
 * Checks that the MongoDB connection in backend/.env works, without starting the app.
 *   npm run db:check
 * Prints which database you are connected to and which collections it has.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../db/connect';

async function main() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is empty in backend/.env');

  // Show the address with the password hidden
  console.log('Connecting to:', env.mongoUri.replace(/\/\/([^:/]+):([^@]+)@/, '//$1:****@'));
  if (!/mongodb(\+srv)?:\/\/[^/]+\/[^?/]+/.test(env.mongoUri)) {
    console.warn('Note: no database name in MONGODB_URI, so data will go to the "test" database.\n' +
      '      Add "hopeconnect" right after ".mongodb.net/" (before the "?").');
  }

  const started = Date.now();
  await connectDb(env.mongoUri);
  await mongoose.connection.db!.admin().ping();

  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log(`\n✔ Connected to MongoDB in ${Date.now() - started} ms`);
  console.log(`  Database:    ${mongoose.connection.name}`);
  console.log(`  Host:        ${mongoose.connection.host}`);
  console.log(`  Collections: ${collections.map(c => c.name).sort().join(', ') || '(none yet — they appear after the first sign-up)'}`);
}

main()
  .catch(err => {
    console.error(`\n✖ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
