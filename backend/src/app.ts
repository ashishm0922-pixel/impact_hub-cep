import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/error-handler';
import { apiRouter } from './routes';

/** Builds the Express app (kept separate from server.ts so tests can import it). */
export function createApp() {
  const app = express();

  app.use(helmet());
  // Only the frontend origin(s) listed in CORS_ORIGIN may call the API from a browser
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
