/**
 * All environment variables are read in ONE place, with defaults.
 * server.ts loads the .env file before anything imports this.
 */
export const env = {
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map(o => o.trim()),
  databaseUrl: process.env.DATABASE_URL || ''
};
