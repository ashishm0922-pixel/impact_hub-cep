/**
 * Adds the sample NGOs, drives and campaigns — only if the database has no NGOs yet.
 * (The server also does this automatically on start-up unless SEED_SAMPLE_DATA=false.)
 *   npm run seed
 */
import 'dotenv/config';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../db/connect';
import { seedSampleData } from '../db/sample-data';

async function main() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is missing in backend/.env');
  await connectDb(env.mongoUri);
  console.log((await seedSampleData()) ? 'Sample data added.' : 'NGOs already exist — nothing added.');
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
