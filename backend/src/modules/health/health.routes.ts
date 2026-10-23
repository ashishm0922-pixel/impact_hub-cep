import { Router } from 'express';
import { isDatabaseConfigured } from '../../lib/prisma';

export const healthRoutes = Router();

// GET /api/health
healthRoutes.get('/', (_req, res) => {
  res.json({ status: 'ok', database: isDatabaseConfigured ? 'configured' : 'not configured' });
});
