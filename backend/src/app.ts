import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/error-handler';
import { protectAgainstCsrf } from './middlewares/security';
import { createApiRouter, type ApiOptions } from './routes';

// backend/src (dev) and backend/dist (build) are both two levels below the project root
const FRONTEND_DIR = path.resolve(__dirname, '..', '..', 'frontend');

/** Builds the Express app (kept separate from server.ts so tests can create their own). */
export function createApp(options: ApiOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          // the pages use onclick="..." attributes
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"]
        }
      }
    })
  );

  // Only needed if the website is served from a DIFFERENT origin (e.g. :5500).
  // credentials: true lets that origin send the session cookie.
  app.use('/api', cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use('/api', protectAgainstCsrf);

  app.use('/api', createApiRouter(options));
  app.use('/api', notFound);

  // Serve the website too, so site + API share one origin (simplest and safest for cookies)
  if (env.serveFrontend) app.use(express.static(FRONTEND_DIR, { extensions: ['html'] }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
