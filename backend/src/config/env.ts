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
  mongoUri: (process.env.MONGODB_URI || '').trim(),

  // Optional DNS servers for looking up the Atlas address, e.g. "8.8.8.8,1.1.1.1"
  dnsServers: (process.env.DNS_SERVERS || '').split(',').map(s => s.trim()).filter(Boolean),

  // Extra frontend origins allowed to call the API (the backend's own origin is always allowed)
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),

  // false (default): users can log in right after sign-up and verify their email.
  // true: every new account must ALSO be approved by an admin before logging in.
  requireAdminApproval: toBool(process.env.REQUIRE_ADMIN_APPROVAL, false),

  // Public address of the website, used to build the link in verification emails
  appUrl: (process.env.APP_URL || `http://localhost:${toNumber(process.env.PORT, 4000)}`).replace(/\/+$/, ''),

  // Email (SMTP). If SMTP_HOST is empty, emails are NOT sent: the link is printed in the terminal instead.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  mailFrom: process.env.MAIL_FROM || 'HopeConnect <no-reply@hopeconnect.local>',
  verifyEmailHours: toNumber(process.env.VERIFY_EMAIL_HOURS, 24),

  userSessionDays: toNumber(process.env.USER_SESSION_DAYS, 7),
  adminSessionHours: toNumber(process.env.ADMIN_SESSION_HOURS, 8),

  // Failed login attempts allowed per IP address every 15 minutes
  loginRateLimit: toNumber(process.env.LOGIN_RATE_LIMIT, 10),

  // First admin account (created automatically on startup if it doesn't exist yet)
  adminUsername: (process.env.ADMIN_USERNAME || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Serve the website (../frontend) from this server, so site + API share one origin
  serveFrontend: toBool(process.env.SERVE_FRONTEND, true),

  // Fill an empty database with sample NGOs, drives and campaigns on start-up
  seedSampleData: toBool(process.env.SEED_SAMPLE_DATA, true),

  // Set to 1 when running behind a proxy/load balancer (Render, Railway, Nginx)
  trustProxy: toBool(process.env.TRUST_PROXY, false)
};
