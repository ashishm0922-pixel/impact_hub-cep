import { Router } from 'express';
import { isDbConnected } from '../../db/connect';

export const healthRoutes = Router();

// GET /api/health
healthRoutes.get('/', (_req, res) => {
  res.json({ status: 'ok', database: isDbConnected() ? 'connected' : 'not connected' });
});
