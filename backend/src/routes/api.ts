import { Router } from 'express';
import { isDatabaseConfigured } from '../lib/db';
import { HttpError, requireDb } from '../lib/http';
import {
  contactMessageSchema,
  listQuerySchema,
  ngoApplicationSchema,
  registrationSchema
} from '../lib/validation';

export const api = Router();

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

// ---------- Health ----------
api.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: isDatabaseConfigured ? 'configured' : 'not configured' });
});

// ---------- NGOs ----------
api.get('/ngos', async (req, res) => {
  const db = requireDb();
  const { category, search } = listQuerySchema.parse(req.query);
  const ngos = await db.ngo.findMany({
    where: {
      category,
      status: { not: 'REJECTED' },
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ] })
    },
    orderBy: [{ status: 'desc' }, { name: 'asc' }]
  });
  res.json(ngos);
});

// New NGOs always start as PENDING_VERIFICATION — verification is a manual admin step.
api.post('/ngos', async (req, res) => {
  const db = requireDb();
  const data = ngoApplicationSchema.parse(req.body);
  const ngo = await db.ngo.create({
    data: { ...data, website: data.website || null, slug: slugify(data.name), status: 'PENDING_VERIFICATION' }
  });
  res.status(201).json(ngo);
});

// ---------- Opportunities ----------
api.get('/opportunities', async (req, res) => {
  const db = requireDb();
  const { category, search, city } = listQuerySchema.parse(req.query);
  const opportunities = await db.opportunity.findMany({
    where: {
      category,
      status: 'OPEN',
      date: { gte: new Date(new Date().toDateString()) },
      ...(city && { city: { equals: city, mode: 'insensitive' } }),
      ...(search && { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ] })
    },
    include: {
      ngo: { select: { id: true, name: true, status: true } },
      _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } }
    },
    orderBy: { date: 'asc' }
  });
  res.json(opportunities);
});

api.post('/opportunities/:id/registrations', async (req, res) => {
  const db = requireDb();
  const data = registrationSchema.parse(req.body);

  // A transaction so two people can't take the last spot at the same time
  const registration = await db.$transaction(async tx => {
    const opportunity = await tx.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opportunity) throw new HttpError(404, 'Opportunity not found.');
    if (opportunity.status !== 'OPEN') throw new HttpError(409, 'Registration is closed for this opportunity.');

    const taken = await tx.registration.count({
      where: { opportunityId: opportunity.id, status: { not: 'CANCELLED' } }
    });
    if (taken >= opportunity.volunteersNeeded) throw new HttpError(409, 'All spots are filled.');

    return tx.registration.create({
      data: { ...data, opportunityId: opportunity.id, hours: opportunity.hours }
    });
  });

  res.status(201).json(registration);
});

// ---------- Campaigns ----------
api.get('/campaigns', async (req, res) => {
  const db = requireDb();
  const { category } = listQuerySchema.parse(req.query);
  const campaigns = await db.campaign.findMany({
    where: { category, status: 'ACTIVE' },
    include: { ngo: { select: { id: true, name: true, status: true } } },
    orderBy: [{ featured: 'desc' }, { endDate: 'asc' }]
  });

  // "Raised" only counts payments the provider has CONFIRMED
  const totals = await db.donation.groupBy({
    by: ['campaignId'],
    where: { status: 'SUCCEEDED' },
    _sum: { amountPaise: true },
    _count: true
  });
  const byCampaign = new Map(totals.map(t => [t.campaignId, t]));

  res.json(campaigns.map(c => ({
    ...c,
    raisedPaise: byCampaign.get(c.id)?._sum.amountPaise ?? 0,
    supporters: byCampaign.get(c.id)?._count ?? 0
  })));
});

// Donations are intentionally NOT implemented here: they must go through a payment
// provider (e.g. Razorpay) and be marked SUCCEEDED only from a verified webhook.
api.post('/campaigns/:id/donations', (_req, _res) => {
  throw new HttpError(501, 'Online payments are not connected yet. See README: "Payments".');
});

// ---------- Contact ----------
api.post('/contact', async (req, res) => {
  const db = requireDb();
  const data = contactMessageSchema.parse(req.body);
  const message = await db.contactMessage.create({ data });
  res.status(201).json({ id: message.id, receivedAt: message.createdAt });
});
