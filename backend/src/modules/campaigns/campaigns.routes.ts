import { Router } from 'express';
import { CampaignModel, DonationModel } from '../../models/campaign.model';
import { listQuerySchema } from '../../shared/schemas';
import { HttpError } from '../../utils/http-error';

export const campaignRoutes = Router();

// GET /api/campaigns?category=
campaignRoutes.get('/', async (req, res) => {
  const { category } = listQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { status: 'active' };
  if (category) filter.category = category;

  const campaigns = await CampaignModel.find(filter).populate('ngo', 'name status').sort({ featured: -1, endDate: 1 });

  // "Raised" only counts payments the provider has CONFIRMED
  const totals = await DonationModel.aggregate<{ _id: unknown; raisedPaise: number; supporters: number }>([
    { $match: { status: 'succeeded' } },
    { $group: { _id: '$campaign', raisedPaise: { $sum: '$amountPaise' }, supporters: { $sum: 1 } } }
  ]);
  const byCampaign = new Map(totals.map(t => [String(t._id), t]));

  res.json(campaigns.map(c => ({
    ...c.toJSON(),
    raisedPaise: byCampaign.get(String(c._id))?.raisedPaise ?? 0,
    supporters: byCampaign.get(String(c._id))?.supporters ?? 0
  })));
});

// POST /api/campaigns/:id/donations
// Intentionally NOT implemented: donations must go through a payment provider (e.g. Razorpay)
// and be marked "succeeded" only from a verified webhook. See backend/README.md → "Payments".
campaignRoutes.post('/:id/donations', () => {
  throw new HttpError(501, 'Online payments are not connected yet.', { code: 'NOT_IMPLEMENTED' });
});
