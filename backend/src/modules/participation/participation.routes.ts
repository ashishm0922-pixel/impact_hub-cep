import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../../middlewares/auth';
import { CampaignModel, DonationModel } from '../../models/campaign.model';
import { NgoModel } from '../../models/ngo.model';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { REPORT_REASONS, REPORT_TARGETS, ReportModel } from '../../models/report.model';
import { AVAILABILITY } from '../../models/shared';
import { nameSchema, objectIdSchema } from '../../shared/schemas';
import { publicUser } from '../auth/auth.service';
import { donorLeaderboard, publicName, volunteerLeaderboard } from '../admin/leaderboard.service';
import { todayISODate, toISODate } from '../../utils/dates';
import { HttpError } from '../../utils/http-error';
import { audit } from '../audit/audit.service';
import { buildCampaigns, buildOpportunities, buildPledges, buildRegistrations, publicCatalog } from '../catalog/catalog.service';

/**
 * Public catalog + what logged-in users do: join drives, pledge, cancel, report content.
 */
export const participationRoutes = Router();

const registrationSchema = z.object({
  skills: z.string().trim().max(200, 'Keep skills under 200 characters.').optional(),
  availability: z.enum(AVAILABILITY).default('Flexible')
});

const pledgeSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter an amount in rupees.' })
    .int('Enter a whole rupee amount.')
    .min(10, 'Minimum amount is ₹10.')
    .max(1000000, 'Maximum amount is ₹10,00,000.')
});

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: objectIdSchema,
  reason: z.enum(REPORT_REASONS, { errorMap: () => ({ message: 'Choose a reason.' }) }),
  details: z.string().trim().max(500, 'Keep details under 500 characters.').optional()
});

function requireVerifiedEmail(user: { emailVerified?: boolean | null }, what: string) {
  if (!user.emailVerified) {
    throw new HttpError(403, `Please verify your email before ${what}.`, { code: 'EMAIL_NOT_VERIFIED' });
  }
}

const profileSchema = z.object({
  name: nameSchema,
  city: z.string().trim().max(60, 'City is too long.')
    .regex(/^[\p{L}][\p{L} .,'-]*$/u, 'City can only contain letters, spaces and basic punctuation.').optional().or(z.literal('')),
  anonymous: z.boolean().default(false)
});

// GET /api/leaderboard?type=volunteers|donors — PUBLIC: first name + initial only, never emails/phones
participationRoutes.get('/leaderboard', async (req, res) => {
  const { type } = z.object({ type: z.enum(['volunteers', 'donors']).default('volunteers') }).parse(req.query);
  if (type === 'donors') {
    const rows = (await donorLeaderboard(20)).filter(r => r.amount > 0);
    return res.json({ type, rows: rows.map((r, i) => ({
      rank: i + 1, name: publicName(r.name, r.anonymous, 'Donor'), city: r.anonymous ? '' : r.city,
      amount: r.amount, campaignsSupported: r.campaignsSupported, points: r.points, tier: r.tier
    })) });
  }
  const rows = (await volunteerLeaderboard(20)).filter(r => r.points > 0);
  res.json({ type, rows: rows.map((r, i) => ({
    rank: i + 1, name: publicName(r.name, r.anonymous, 'Volunteer'), city: r.anonymous ? '' : r.city,
    hours: r.hours, events: r.events, points: r.points, tier: r.tier
  })) });
});

// PATCH /api/me/profile — name, city and "anonymous on leaderboards" (email/phone are login details and stay fixed)
participationRoutes.patch('/me/profile', requireUser, async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = req.user!;
  user.name = data.name;
  user.city = data.city || undefined;
  user.anonymous = data.anonymous;
  await user.save();
  await audit(req, 'PROFILE_UPDATED', { target: { type: 'User', id: user._id }, details: { anonymous: data.anonymous } });
  res.json({ message: 'Profile saved.', user: publicUser(user) });
});

// GET /api/catalog — everything the public pages show
participationRoutes.get('/catalog', async (_req, res) => {
  res.json(await publicCatalog());
});

// GET /api/me/activity — the logged-in user's drives and pledges
participationRoutes.get('/me/activity', requireUser, async (req, res) => {
  const [regs, pledges] = await Promise.all([
    RegistrationModel.find({ user: req.user!._id }).sort({ createdAt: -1 }).lean(),
    DonationModel.find({ user: req.user!._id }).sort({ createdAt: -1 }).lean()
  ]);
  res.json({ registrations: await buildRegistrations(regs), pledges: await buildPledges(pledges) });
});

// POST /api/opportunities/:id/registrations — join a drive (account details are used)
participationRoutes.post('/opportunities/:id/registrations', requireUser, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const data = registrationSchema.parse(req.body);
  const user = req.user!;

  if (user.role === 'ngo') {
    throw new HttpError(403, 'NGO accounts manage drives; please use a volunteer account to join one.', { code: 'WRONG_ROLE' });
  }
  requireVerifiedEmail(user, 'joining a drive');

  const opportunity = await OpportunityModel.findById(id);
  if (!opportunity) throw new HttpError(404, 'Opportunity not found.', { code: 'NOT_FOUND' });
  const ngo = await NgoModel.findById(opportunity.ngo);
  if (!ngo || ngo.status !== 'verified') throw new HttpError(404, 'Opportunity not found.', { code: 'NOT_FOUND' });
  if (opportunity.status !== 'open') throw new HttpError(409, 'Registration is closed for this opportunity.', { code: 'CLOSED' });
  if (!opportunity.recurring && toISODate(opportunity.date)! < todayISODate()) {
    throw new HttpError(409, 'This event has already taken place.', { code: 'EVENT_PASSED' });
  }

  const existing = await RegistrationModel.findOne({ opportunity: id, email: user.email });
  if (existing && existing.status !== 'cancelled') {
    throw new HttpError(409, 'You are already registered for this opportunity.', { code: 'ALREADY_REGISTERED' });
  }
  const taken = await RegistrationModel.countDocuments({ opportunity: id, status: { $ne: 'cancelled' } });
  if (taken >= opportunity.volunteersNeeded) throw new HttpError(409, 'All spots are filled.', { code: 'FULL' });

  // A cancelled registration is re-activated instead of creating a duplicate
  const registration = existing ?? new RegistrationModel({ opportunity: id, email: user.email });
  Object.assign(registration, {
    user: user._id,
    name: user.name,
    phone: user.phone,
    skills: data.skills,
    availability: data.availability,
    hours: opportunity.hours,
    status: 'registered'
  });
  await registration.save();

  await audit(req, 'VOLUNTEER_JOINED', { target: { type: 'Opportunity', id }, details: { title: opportunity.title } });
  res.status(201).json({
    registration: (await buildRegistrations([registration.toObject()]))[0],
    opportunity: (await buildOpportunities([opportunity.toObject()]))[0]
  });
});

// POST /api/me/registrations/:id/cancel — the volunteer cancels their own sign-up
participationRoutes.post('/me/registrations/:id/cancel', requireUser, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const registration = await RegistrationModel.findOne({ _id: id, user: req.user!._id });
  if (!registration) throw new HttpError(404, 'Registration not found.', { code: 'NOT_FOUND' });
  if (registration.status !== 'registered') {
    throw new HttpError(409, 'Only upcoming registrations can be cancelled.', { code: 'CANNOT_CANCEL' });
  }
  registration.status = 'cancelled';
  await registration.save();
  await audit(req, 'VOLUNTEER_CANCELLED', { target: { type: 'Registration', id } });
  res.json({ registration: (await buildRegistrations([registration.toObject()]))[0] });
});

// POST /api/campaigns/:id/pledges — DEMO pledge: recorded, but NO money is charged
participationRoutes.post('/campaigns/:id/pledges', requireUser, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const { amount } = pledgeSchema.parse(req.body);
  const user = req.user!;
  requireVerifiedEmail(user, 'supporting a campaign');

  const campaign = await CampaignModel.findById(id);
  if (!campaign) throw new HttpError(404, 'Campaign not found.', { code: 'NOT_FOUND' });
  const ngo = await NgoModel.findById(campaign.ngo);
  if (!ngo || ngo.status !== 'verified') throw new HttpError(404, 'Campaign not found.', { code: 'NOT_FOUND' });
  if (campaign.status !== 'active' || toISODate(campaign.endDate)! < todayISODate()) {
    throw new HttpError(409, 'This campaign is no longer accepting support.', { code: 'CLOSED' });
  }

  const pledge = await DonationModel.create({
    campaign: id,
    user: user._id,
    donorName: user.name,
    donorEmail: user.email,
    amountPaise: amount * 100,
    status: 'pledged',
    reference: `DEMO-${randomInt(100000, 999999)}`
  });

  await audit(req, 'PLEDGE_RECORDED', { target: { type: 'Campaign', id }, details: { amount, demo: true } });
  res.status(201).json({
    pledge: (await buildPledges([pledge.toObject()]))[0],
    campaign: (await buildCampaigns([campaign.toObject()]))[0]
  });
});

// POST /api/reports — flag an NGO, campaign or drive for admin review
participationRoutes.post('/reports', requireUser, async (req, res) => {
  const data = reportSchema.parse(req.body);
  const models = { ngo: NgoModel, campaign: CampaignModel, opportunity: OpportunityModel } as const;
  const target = await (models[data.targetType] as typeof NgoModel).findById(data.targetId).lean<Record<string, any>>();
  if (!target) throw new HttpError(404, 'The item you are reporting no longer exists.', { code: 'NOT_FOUND' });

  const report = await ReportModel.create({
    ...data,
    targetName: target.name || target.title,
    reporter: req.user!._id
  }).catch((err: { code?: number }) => {
    if (err.code === 11000) throw new HttpError(409, 'You have already reported this. Our team will review it.', { code: 'ALREADY_REPORTED' });
    throw err;
  });

  await audit(req, 'CONTENT_FLAGGED', { target: { type: 'Report', id: report._id }, details: { targetType: data.targetType, reason: data.reason } });
  res.status(201).json({ message: 'Thank you. Our team will review this report.' });
});
