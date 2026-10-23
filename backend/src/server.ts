import 'dotenv/config'; // must be first: loads backend/.env before config/env.ts reads it
import os from 'node:os';
import { createApp } from './app';
import { env } from './config/env';
import { connectDb } from './db/connect';
import { adminPasswordMatches, upsertAdmin } from './modules/admin/admin.service';

/** Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD if it doesn't exist yet. */
async function ensureAdmin() {
  if (!env.adminUsername || !env.adminPassword) {
    console.warn('No ADMIN_USERNAME / ADMIN_PASSWORD in .env: skipping admin creation (see README).');
    return;
  }
  const result = await upsertAdmin(env.adminUsername, env.adminPassword);
  if (result === 'created') {
    console.log(`Admin account "${env.adminUsername}" created.`);
  } else if (!(await adminPasswordMatches(env.adminUsername, env.adminPassword))) {
    // Startup never overwrites an existing admin password by itself, so say so clearly
    console.warn(
      `ADMIN_PASSWORD in .env does NOT match the saved password for "${env.adminUsername}".\n` +
      '  To make the .env password the real one, run:  npm run admin:create -- --reset'
    );
  }
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i!.address);
}

export async function startServer(mongoUri = env.mongoUri) {
  if (mongoUri) {
    await connectDb(mongoUri);
    console.log('Connected to MongoDB.');
    await ensureAdmin();
  } else {
    console.warn('MONGODB_URI is not set: the website works, but login/sign-up will answer 503.');
  }

  const app = createApp();
  return app.listen(env.port, () => {
    console.log(`HopeConnect is running:  http://localhost:${env.port}`);
    // Addresses for phones/other computers on the same Wi-Fi
    for (const ip of lanAddresses()) console.log(`On your Wi-Fi network:   http://${ip}:${env.port}`);
    console.log(`Links in emails use:     ${env.appUrl}`);
    console.log(`Admin panel:             http://localhost:${env.port}/pages/admin.html`);
  });
}

// Run directly (npm run dev / npm start)
if (require.main === module) {
  startServer().catch(err => {
    console.error(`\n${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  });
}
