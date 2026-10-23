import { Router } from 'express';
import { campaignRoutes } from '../modules/campaigns/campaigns.routes';
import { contactRoutes } from '../modules/contact/contact.routes';
import { healthRoutes } from '../modules/health/health.routes';
import { ngoRoutes } from '../modules/ngos/ngos.routes';
import { opportunityRoutes } from '../modules/opportunities/opportunities.routes';

/** Every module's routes, mounted under /api in app.ts */
export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/ngos', ngoRoutes);
apiRouter.use('/opportunities', opportunityRoutes);
apiRouter.use('/campaigns', campaignRoutes);
apiRouter.use('/contact', contactRoutes);
