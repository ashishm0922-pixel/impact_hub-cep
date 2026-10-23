/**
 * Every environment variable is read here, in ONE place, with safe defaults.
 * server.ts loads backend/.env (via dotenv) before this file is imported.
 */
const toBool = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes'].includes(value.toLowerCase());

const toNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: toNumber(process.env.PORT, 4000),

  // MongoDB Atlas connection string, e.g. mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/hopeconnect
  mongoUri: process.env.MONGODB_URI || '',

  // Extra frontend origins allowed to call the API (the backend's own origin is always allowed)
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),

  // false (default): every new account waits for an admin to approve it
  autoApproveUsers: toBool(process.env.AUTO_APPROVE_USERS, false),

  userSessionDays: toNumber(process.env.USER_SESSION_DAYS, 7),
  adminSessionHours: toNumber(process.env.ADMIN_SESSION_HOURS, 8),

  // Failed login attempts allowed per IP address every 15 minutes
  loginRateLimit: toNumber(process.env.LOGIN_RATE_LIMIT, 10),

  // First admin account (created automatically on startup if it doesn't exist yet)
  adminUsername: (process.env.ADMIN_USERNAME || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Serve the website (../frontend) from this server, so site + API share one origin
  serveFrontend: toBool(process.env.SERVE_FRONTEND, true),

  // Set to 1 when running behind a proxy/load balancer (Render, Railway, Nginx)
  trustProxy: toBool(process.env.TRUST_PROXY, false)
};
