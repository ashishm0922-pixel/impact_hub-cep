import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../../middlewares/auth';
import { CampaignModel, DonationModel } from '../../models/campaign.model';
import { NgoModel, type NgoDocument } from '../../models/ngo.model';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { AVAILABILITY, CATEGORIES } from '../../models/shared';
import { emailSchema, objectIdSchema } from '../../shared/schemas';
import { fromISODate, todayISODate, toISODate } from '../../utils/dates';
import { HttpError } from '../../utils/http-error';
import { audit } from '../audit/audit.service';
import { buildCampaigns, buildOpportunities, buildPledges, buildRegistrations } from '../catalog/catalog.service';
import { ngoDto } from '../catalog/catalog.dto';

/** /api/ngo/* — the NGO console: organization profile, drives, campaigns, participants. */
export const ngoRoutes = Router();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ngo?: NgoDocument | null;
    }
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date.');
const httpsUrl = z.string().trim().max(500).regex(/^https:\/\/\S+$/i, 'Use a full https:// link.').optional().or(z.literal(''));

const organizationSchema = z.object({
  name: z.string({ required_error: 'Organization name is required.' }).trim().min(3, 'Organization name must be at least 3 characters.').max(80),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Choose a cause category.' }) }),
  location: z.string().trim().min(3, 'Location must be at least 3 characters.').max(80),
  email: emailSchema,
  website: z.string().trim().max(200).regex(/^https?:\/\/[^\s.]+\.\S{2,}$/i, 'Enter a full URL starting with https://').optional().or(z.literal('')),
  registrationNumber: z.string().trim().max(40, 'Registration number is too long.').optional().or(z.literal('')),
  foundedYear: z.number({ invalid_type_error: 'Year founded must be a number.' }).int().min(1850, 'Enter a year after 1850.').max(new Date().getFullYear(), 'Year founded cannot be in the future.'),
  description: z.string().trim().min(40, 'Description must be at least 40 characters.').max(600)
});

const opportunitySchema = z.object({
  title: z.string().trim().min(6, 'Title must be at least 6 characters.').max(100),
  category: z.enum(CATEGORIES),
  date: isoDate,
  city: z.string().trim().min(2, 'City must be at least 2 characters.').max(40),
  venue: z.string().trim().max(60).optional().or(z.literal('')),
  volunteersNeeded: z.number().int().min(1, 'At least 1 volunteer.').max(500, 'At most 500 volunteers.'),
  hours: z.number().int().min(1, 'At least 1 hour.').max(12, 'At most 12 hours.'),
  availability: z.enum(AVAILABILITY).default('Flexible'),
  skills: z.array(z.string().trim().toLowerCase().max(30)).max(10).default([]),
  remote: z.boolean().default(false),
  description: z.string().trim().min(30, 'Description must be at least 30 characters.').max(500)
});

const campaignSchema = z.object({
  title: z.string().trim().min(8, 'Title must be at least 8 characters.').max(100),
  category: z.enum(CATEGORIES),
  goal: z.number().int('Goal must be a whole number.').min(1000, 'Goal must be at least ₹1,000.').max(10000000, 'Goal must be at most ₹1,00,00,000.'),
  location: z.string().trim().min(3, 'Location must be at least 3 characters.').max(80),
  endDate: isoDate,
  image: httpsUrl,
  description: z.string().trim().min(30, 'Description must be at least 30 characters.').max(600)
});

const statusSchema = <T extends [string, ...string[]]>(values: T) => z.object({ status: z.enum(values) });
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

/* ---------------- Guards ---------------- */
async function requireNgoAccount(req: Request, _res: Response, next: NextFunction) {
  if (req.user!.role !== 'ngo') {
    throw new HttpError(403, 'This area is for NGO accounts.', { code: 'WRONG_ROLE' });
  }
  req.ngo = await NgoModel.findOne({ owner: req.user!._id });
  next();
}

function requireVerifiedNgo(req: Request) {
  if (!req.ngo) throw new HttpError(403, 'Register your organization first.', { code: 'NO_ORGANIZATION' });
  if (req.ngo.status !== 'verified') {
    throw new HttpError(403, 'Your organization must be verified by an admin before you can publish.', { code: 'NGO_NOT_VERIFIED' });
  }
  return req.ngo;
}

ngoRoutes.use(requireUser, requireNgoAccount);

/* ---------------- Console ---------------- */

// GET /api/ngo/console — everything for the NGO dashboard
ngoRoutes.get('/console', async (req, res) => {
  const ngo = req.ngo;
  if (!ngo) return res.json({ ngo: null, opportunities: [], campaigns: [], registrations: [], pledges: [] });

  const [opps, campaigns] = await Promise.all([
    OpportunityModel.find({ ngo: ngo._id }).sort({ date: -1 }).lean(),
    CampaignModel.find({ ngo: ngo._id }).sort({ createdAt: -1 }).lean()
  ]);
  const [regs, pledges] = await Promise.all([
    RegistrationModel.find({ opportunity: { $in: opps.map(o => o._id) } }).sort({ createdAt: -1 }).lean(),
    DonationModel.find({ campaign: { $in: campaigns.map(c => c._id) }, status: { $in: ['pledged', 'succeeded'] } }).sort({ createdAt: -1 }).limit(200).lean()
  ]);

  res.json({
    ngo: ngoDto(ngo.toObject()),
    opportunities: await buildOpportunities(opps),
    campaigns: await buildCampaigns(campaigns),
    registrations: await buildRegistrations(regs),
    pledges: await buildPledges(pledges)
  });
});

// POST /api/ngo/organization — submit (or re-submit after rejection) the organization for verification
ngoRoutes.post('/organization', async (req, res) => {
  const data = organizationSchema.parse(req.body);
  if (req.ngo && req.ngo.status !== 'rejected') {
    throw new HttpError(409, 'Your organization is already registered.', { code: 'ALREADY_REGISTERED' });
  }
  const existingName = await NgoModel.findOne({ name: data.name, _id: { $ne: req.ngo?._id } }).collation({ locale: 'en', strength: 2 });
  if (existingName) {
    throw new HttpError(409, 'An NGO with this name is already listed.', { code: 'DUPLICATE', fields: [{ field: 'name', message: 'An NGO with this name is already listed.' }] });
  }

  const values = {
    ...data,
    website: data.website || undefined,
    registrationNumber: data.registrationNumber || undefined,
    slug: `${slugify(data.name)}-${String(req.user!._id).slice(-6)}`,
    status: 'pending',
    statusReason: undefined,
    owner: req.user!._id
  };
  const ngo = req.ngo ? Object.assign(req.ngo, values) : new NgoModel(values);
  await ngo.save();

  await audit(req, 'NGO_SUBMITTED', { target: { type: 'Ngo', id: ngo._id }, details: { name: ngo.name } });
  res.status(201).json({ message: 'Submitted! An admin will review your organization.', ngo: ngoDto(ngo.toObject()) });
});

/* ---------------- Drives ---------------- */
ngoRoutes.post('/opportunities', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const data = opportunitySchema.parse(req.body);
  if (data.date < todayISODate()) {
    throw new HttpError(400, 'Pick today or a future date.', { code: 'VALIDATION_ERROR', fields: [{ field: 'date', message: 'Pick today or a future date.' }] });
  }
  const opp = await OpportunityModel.create({
    ...data,
    date: fromISODate(data.date),
    location: data.venue ? `${data.city} (${data.venue})` : data.city,
    imageUrl: ngo.bannerUrl,
    ngo: ngo._id
  });
  await audit(req, 'DRIVE_CREATED', { target: { type: 'Opportunity', id: opp._id }, details: { title: opp.title } });
  res.status(201).json({ opportunity: (await buildOpportunities([opp.toObject()]))[0] });
});

ngoRoutes.patch('/opportunities/:id', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const { status } = statusSchema(['open', 'closed'] as ['open', 'closed']).parse(req.body);
  const opp = await OpportunityModel.findOne({ _id: objectIdSchema.parse(req.params.id), ngo: ngo._id });
  if (!opp) throw new HttpError(404, 'Drive not found.', { code: 'NOT_FOUND' });
  opp.status = status;
  await opp.save();
  await audit(req, status === 'closed' ? 'DRIVE_CLOSED' : 'DRIVE_REOPENED', { target: { type: 'Opportunity', id: opp._id } });
  res.json({ opportunity: (await buildOpportunities([opp.toObject()]))[0] });
});

ngoRoutes.delete('/opportunities/:id', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const opp = await OpportunityModel.findOne({ _id: objectIdSchema.parse(req.params.id), ngo: ngo._id });
  if (!opp) throw new HttpError(404, 'Drive not found.', { code: 'NOT_FOUND' });
  // Keep volunteers' history: a drive with sign-ups can only be closed
  if (await RegistrationModel.exists({ opportunity: opp._id })) {
    throw new HttpError(409, 'Volunteers have signed up for this drive. Close it instead of deleting it.', { code: 'HAS_PARTICIPANTS' });
  }
  await opp.deleteOne();
  await audit(req, 'DRIVE_DELETED', { target: { type: 'Opportunity', id: opp._id }, details: { title: opp.title } });
  res.json({ message: 'Drive deleted.' });
});

/* ---------------- Campaigns ---------------- */
ngoRoutes.post('/campaigns', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const data = campaignSchema.parse(req.body);
  if (data.endDate <= todayISODate()) {
    throw new HttpError(400, 'Pick a future end date.', { code: 'VALIDATION_ERROR', fields: [{ field: 'endDate', message: 'Pick a future end date.' }] });
  }
  const campaign = await CampaignModel.create({
    title: data.title,
    category: data.category,
    location: data.location,
    description: data.description,
    goalPaise: data.goal * 100,
    endDate: fromISODate(data.endDate),
    imageUrl: data.image || ngo.bannerUrl,
    ngo: ngo._id
  });
  await audit(req, 'CAMPAIGN_CREATED', { target: { type: 'Campaign', id: campaign._id }, details: { title: campaign.title } });
  res.status(201).json({ campaign: (await buildCampaigns([campaign.toObject()]))[0] });
});

ngoRoutes.patch('/campaigns/:id', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const { status } = statusSchema(['active', 'closed'] as ['active', 'closed']).parse(req.body);
  const campaign = await CampaignModel.findOne({ _id: objectIdSchema.parse(req.params.id), ngo: ngo._id });
  if (!campaign) throw new HttpError(404, 'Campaign not found.', { code: 'NOT_FOUND' });
  campaign.status = status;
  await campaign.save();
  await audit(req, status === 'closed' ? 'CAMPAIGN_CLOSED' : 'CAMPAIGN_REOPENED', { target: { type: 'Campaign', id: campaign._id } });
  res.json({ campaign: (await buildCampaigns([campaign.toObject()]))[0] });
});

ngoRoutes.delete('/campaigns/:id', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const campaign = await CampaignModel.findOne({ _id: objectIdSchema.parse(req.params.id), ngo: ngo._id });
  if (!campaign) throw new HttpError(404, 'Campaign not found.', { code: 'NOT_FOUND' });
  if (await DonationModel.exists({ campaign: campaign._id })) {
    throw new HttpError(409, 'This campaign has supporters. Close it instead of deleting it.', { code: 'HAS_SUPPORTERS' });
  }
  await campaign.deleteOne();
  await audit(req, 'CAMPAIGN_DELETED', { target: { type: 'Campaign', id: campaign._id }, details: { title: campaign.title } });
  res.json({ message: 'Campaign deleted.' });
});

/* ---------------- Participants ---------------- */

// PATCH /api/ngo/registrations/:id  { status: attended | no-show | cancelled }
ngoRoutes.patch('/registrations/:id', async (req, res) => {
  const ngo = requireVerifiedNgo(req);
  const { status } = statusSchema(['attended', 'no-show', 'cancelled'] as ['attended', 'no-show', 'cancelled']).parse(req.body);
  const registration = await RegistrationModel.findById(objectIdSchema.parse(req.params.id));
  const opp = registration ? await OpportunityModel.findOne({ _id: registration.opportunity, ngo: ngo._id }) : null;
  if (!registration || !opp) throw new HttpError(404, 'Participant not found.', { code: 'NOT_FOUND' });

  // You can't attend (or miss) an event that hasn't happened yet
  if (status !== 'cancelled' && toISODate(opp.date)! > todayISODate()) {
    throw new HttpError(409, 'Attendance can be marked on or after the event date.', { code: 'TOO_EARLY' });
  }
  registration.status = status;
  await registration.save();
  await audit(req, 'ATTENDANCE_MARKED', { target: { type: 'Registration', id: registration._id }, details: { status, volunteer: registration.name } });
  res.json({ registration: (await buildRegistrations([registration.toObject()]))[0] });
});
