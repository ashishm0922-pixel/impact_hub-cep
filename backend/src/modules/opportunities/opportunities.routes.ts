import { Router } from 'express';
import { requireUser } from '../../middlewares/auth';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { escapeRegex, listQuerySchema, objectIdSchema } from '../../shared/schemas';
import { HttpError } from '../../utils/http-error';
import { registrationSchema } from './opportunities.schemas';

export const opportunityRoutes = Router();

// GET /api/opportunities?category=&city=&search=
opportunityRoutes.get('/', async (req, res) => {
  const { category, search, city } = listQuerySchema.parse(req.query);
  const startOfToday = new Date(new Date().toDateString());

  const filter: Record<string, unknown> = { status: 'open', date: { $gte: startOfToday } };
  if (category) filter.category = category;
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { location: pattern }];
  }

  const opportunities = await OpportunityModel.find(filter).populate('ngo', 'name status').sort({ date: 1 });
  res.json(opportunities);
});

// POST /api/opportunities/:id/registrations — logged-in, approved users only
opportunityRoutes.post('/:id/registrations', requireUser, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const data = registrationSchema.parse(req.body);
  const user = req.user!;
  if (!user.emailVerified) {
    throw new HttpError(403, 'Please verify your email before joining a drive.', { code: 'EMAIL_NOT_VERIFIED' });
  }

  const opportunity = await OpportunityModel.findById(id);
  if (!opportunity) throw new HttpError(404, 'Opportunity not found.', { code: 'NOT_FOUND' });
  if (opportunity.status !== 'open') throw new HttpError(409, 'Registration is closed for this opportunity.', { code: 'CLOSED' });

  const taken = await RegistrationModel.countDocuments({ opportunity: id, status: { $ne: 'cancelled' } });
  if (taken >= opportunity.volunteersNeeded) throw new HttpError(409, 'All spots are filled.', { code: 'FULL' });

  // The unique index (opportunity + email) blocks double registration → 409 from the error handler
  const registration = await RegistrationModel.create({
    ...data,
    opportunity: opportunity._id,
    user: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    hours: opportunity.hours
  });

  res.status(201).json(registration);
});
