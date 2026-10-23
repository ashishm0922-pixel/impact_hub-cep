import { Router } from 'express';
import { requireDb } from '../middlewares/security';
import { createAdminRoutes } from '../modules/admin/admin.routes';
import { createAuthRoutes } from '../modules/auth/auth.routes';
import { campaignRoutes } from '../modules/campaigns/campaigns.routes';
import { contactRoutes } from '../modules/contact/contact.routes';
import { healthRoutes } from '../modules/health/health.routes';
import { ngoRoutes } from '../modules/ngos/ngos.routes';
import { opportunityRoutes } from '../modules/opportunities/opportunities.routes';

export interface ApiOptions {
  loginLimit?: number;
  signupLimit?: number;
}

/** Every module's routes, mounted under /api in app.ts */
export function createApiRouter(options: ApiOptions = {}) {
  const api = Router();

  // Works even without a database
  api.use('/health', healthRoutes);

  // Everything below needs MongoDB
  api.use(requireDb);
  api.use('/auth', createAuthRoutes(options));
  api.use('/admin', createAdminRoutes(options));
  api.use('/ngos', ngoRoutes);
  api.use('/opportunities', opportunityRoutes);
  api.use('/campaigns', campaignRoutes);
  api.use('/contact', contactRoutes);

  return api;
}
