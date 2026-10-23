import { Router } from 'express';
import { requireDb } from '../../lib/prisma';
import { listQuerySchema } from '../../shared/schemas';
import { HttpError } from '../../utils/http-error';

export const campaignRoutes = Router();

// GET /api/campaigns?category=
campaignRoutes.get('/', async (req, res) => {
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

// POST /api/campaigns/:id/donations
// Intentionally NOT implemented: donations must go through a payment provider (e.g. Razorpay)
// and be marked SUCCEEDED only from a verified webhook. See backend/README.md → "Payments".
campaignRoutes.post('/:id/donations', () => {
  throw new HttpError(501, 'Online payments are not connected yet. See README: "Payments".');
});
