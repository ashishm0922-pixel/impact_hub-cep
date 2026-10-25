/**
 * Run the full app WITHOUT MongoDB Atlas, using a local MongoDB that is started for you.
 *   npm run dev:local
 * Data is kept in backend/.local-mongo/ between restarts (delete that folder to start fresh).
 * For real use, set MONGODB_URI (Atlas) in .env and run `npm run dev` instead.
 */
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../config/env';
import { startServer } from '../server';

// Local test mode must NEVER send real email (your .env may hold real Gmail settings).
// Verification links are printed in this terminal instead.
env.smtp.host = '';

// Always use the MongoDB binary cached inside backend/node_modules, no matter which
// folder the command is started from (otherwise it would download ~600 MB again).
process.env.MONGOMS_DOWNLOAD_DIR ??= path.resolve(__dirname, '..', '..', 'node_modules', '.cache', 'mongodb-memory-server');

async function main() {
  const dbPath = path.resolve(__dirname, '..', '..', '.local-mongo');
  mkdirSync(dbPath, { recursive: true });

  const mongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger', port: 27018 }
  });
  console.log('Local MongoDB started (data in backend/.local-mongo). Emails are NOT sent in this mode: links print here.');

  const server = await startServer(mongo.getUri('hopeconnect'));

  const shutdown = async () => {
    server.close();
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
