/**
 * Create or reset the admin account.
 *
 *   npm run admin:create              → creates the admin from ADMIN_USERNAME / ADMIN_PASSWORD in .env
 *   npm run admin:create -- --reset   → also REPLACES the password of an existing admin
 *
 * The password is read from .env (not typed on the command line), so it never ends up
 * in your shell history.
 */
import 'dotenv/config';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../db/connect';
import { upsertAdmin } from '../modules/admin/admin.service';

async function main() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is missing in backend/.env');
  if (!env.adminUsername || !env.adminPassword) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env first.');
  }

  await connectDb(env.mongoUri);
  const result = await upsertAdmin(env.adminUsername, env.adminPassword, process.argv.includes('--reset'));
  const messages = {
    created: `Admin "${env.adminUsername}" created.`,
    reset: `Password for admin "${env.adminUsername}" was reset. All their sessions were logged out.`,
    exists: `Admin "${env.adminUsername}" already exists. Use --reset to change the password.`
  };
  console.log(messages[result]);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
