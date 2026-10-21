import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './lib/http';
import { api } from './routes/api';

/** Builds the Express app (kept separate from server.ts so tests can import it). */
export function createApp() {
  const app = express();

  app.use(helmet());
  // Only the frontend origin(s) listed in CORS_ORIGIN may call the API from a browser
  app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);

  return app;
}
