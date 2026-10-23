import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

/** Connects to MongoDB (Atlas or local). Throws a readable error if it fails. */
export async function connectDb(uri: string) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    // Make sure unique indexes (email, phone, username...) exist before we accept requests
    await mongoose.connection.syncIndexes();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not connect to MongoDB: ${message}\n` +
      'Check: 1) MONGODB_URI in backend/.env is correct (user, password, cluster name)\n' +
      '       2) In Atlas → Network Access, your IP address is allowed\n' +
      '       3) In Atlas → Database Access, the user has readWrite permission'
    );
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
