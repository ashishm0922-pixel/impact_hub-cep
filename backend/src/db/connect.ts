import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from '../config/env';

mongoose.set('strictQuery', true);

// Used if the computer's own DNS can't look up the Atlas cluster address
const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1'];

async function tryConnect(uri: string) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
}

/** True for the error you get when DNS can't find "mongodb+srv://..." addresses. */
function isSrvLookupError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('querySrv') || message.includes('ENOTFOUND _mongodb._tcp');
}

/** Connects to MongoDB (Atlas or local). Throws a readable error if it fails. */
export async function connectDb(uri: string) {
  // Optional: DNS_SERVERS=8.8.8.8,1.1.1.1 in .env forces specific DNS servers
  if (env.dnsServers.length) dns.setServers(env.dnsServers);

  try {
    try {
      await tryConnect(uri);
    } catch (err) {
      // Some networks/VPNs/antivirus tools block the special DNS lookup that
      // "mongodb+srv://" needs. Retry once using public DNS servers.
      if (!isSrvLookupError(err) || env.dnsServers.length) throw err;
      console.warn('DNS lookup for MongoDB failed on this network; retrying with public DNS (8.8.8.8, 1.1.1.1)...');
      dns.setServers(PUBLIC_DNS);
      await tryConnect(uri);
    }
    // Make sure unique indexes (email, phone, username...) exist before we accept requests
    await mongoose.connection.syncIndexes();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not connect to MongoDB: ${message}\n` +
      'Check: 1) MONGODB_URI in backend/.env is correct (user, password, cluster name)\n' +
      '       2) In Atlas → Network Access, your IP address is allowed\n' +
      '       3) In Atlas → Database Access, the user has readWrite permission\n' +
      '       4) If the error mentions "querySrv", add DNS_SERVERS=8.8.8.8,1.1.1.1 to backend/.env'
    );
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
