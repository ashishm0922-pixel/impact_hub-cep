import { Router } from 'express';
import { requireDb } from '../middlewares/security';
import { createAdminRoutes } from '../modules/admin/admin.routes';
import { createAuthRoutes } from '../modules/auth/auth.routes';
import { contactRoutes } from '../modules/contact/contact.routes';
import { healthRoutes } from '../modules/health/health.routes';
import { adminDashboardRoutes } from '../modules/admin/admin-dashboard.routes';
import { ngoRoutes } from '../modules/ngo/ngo.routes';
import { participationRoutes } from '../modules/participation/participation.routes';

export interface ApiOptions {
  loginLimit?: number;
  signupLimit?: number;
  resendLimit?: number;
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
  api.use('/admin', adminDashboardRoutes);
  api.use('/ngo', ngoRoutes);
  api.use('/contact', contactRoutes);
  api.use('/', participationRoutes); // /catalog, /me/*, /opportunities/:id/registrations, /campaigns/:id/pledges, /reports

  return api;
}
