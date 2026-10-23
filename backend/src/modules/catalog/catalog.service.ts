import type { Types } from 'mongoose';
import { CampaignModel, DonationModel } from '../../models/campaign.model';
import { NgoModel } from '../../models/ngo.model';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { campaignDto, ngoDto, opportunityDto, pledgeDto, registrationDto } from './catalog.dto';

type Doc = Record<string, any>;
const key = (id: unknown) => String(id);

/** Donations that count towards a campaign: demo pledges + real confirmed payments */
export const COUNTED_DONATION = { status: { $in: ['pledged', 'succeeded'] } };

async function ngoMap(ids: Types.ObjectId[]) {
  const ngos = await NgoModel.find({ _id: { $in: ids } }).lean();
  return new Map(ngos.map(n => [key(n._id), n as Doc]));
}

async function registrationCounts(oppIds: Types.ObjectId[]) {
  const rows = await RegistrationModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { opportunity: { $in: oppIds }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$opportunity', count: { $sum: 1 } } }
  ]);
  return new Map(rows.map(r => [key(r._id), r.count]));
}

async function pledgeTotals(campaignIds: Types.ObjectId[]) {
  const rows = await DonationModel.aggregate<{ _id: Types.ObjectId; paise: number; count: number }>([
    { $match: { campaign: { $in: campaignIds }, ...COUNTED_DONATION } },
    { $group: { _id: '$campaign', paise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
  ]);
  return new Map(rows.map(r => [key(r._id), { paise: r.paise, count: r.count }]));
}

export async function buildOpportunities(opps: Doc[]) {
  const [ngos, counts] = await Promise.all([
    ngoMap(opps.map(o => o.ngo)),
    registrationCounts(opps.map(o => o._id))
  ]);
  return opps.map(o => opportunityDto(o, ngos.get(key(o.ngo)), counts.get(key(o._id)) || 0));
}

export async function buildCampaigns(campaigns: Doc[]) {
  const [ngos, totals] = await Promise.all([
    ngoMap(campaigns.map(c => c.ngo)),
    pledgeTotals(campaigns.map(c => c._id))
  ]);
  return campaigns.map(c => campaignDto(c, ngos.get(key(c.ngo)), totals.get(key(c._id)) || { paise: 0, count: 0 }));
}

export async function buildRegistrations(regs: Doc[]) {
  const opps = await OpportunityModel.find({ _id: { $in: regs.map(r => r.opportunity) } }).lean();
  const oppById = new Map(opps.map(o => [key(o._id), o as Doc]));
  const ngos = await ngoMap(opps.map(o => o.ngo));
  return regs.map(r => {
    const opp = oppById.get(key(r.opportunity));
    return registrationDto(r, opp, opp ? ngos.get(key(opp.ngo)) : undefined);
  });
}

export async function buildPledges(donations: Doc[]) {
  const campaigns = await CampaignModel.find({ _id: { $in: donations.map(d => d.campaign) } }).lean();
  const campaignById = new Map(campaigns.map(c => [key(c._id), c as Doc]));
  const ngos = await ngoMap(campaigns.map(c => c.ngo));
  return donations.map(d => {
    const campaign = campaignById.get(key(d.campaign));
    return pledgeDto(d, campaign, campaign ? ngos.get(key(campaign.ngo)) : undefined);
  });
}

/**
 * Everything the public website shows: NGOs (verified + pending, labelled),
 * and the drives/campaigns of VERIFIED NGOs only.
 */
export async function publicCatalog() {
  const ngos = await NgoModel.find({ status: { $in: ['verified', 'pending'] } }).sort({ status: -1, name: 1 }).lean();
  const verifiedIds = ngos.filter(n => n.status === 'verified').map(n => n._id);

  const [opps, campaigns] = await Promise.all([
    OpportunityModel.find({ ngo: { $in: verifiedIds } }).sort({ date: 1 }).lean(),
    CampaignModel.find({ ngo: { $in: verifiedIds } }).sort({ createdAt: -1 }).lean()
  ]);

  return {
    ngos: ngos.map(n => ngoDto(n)),
    opportunities: await buildOpportunities(opps),
    campaigns: await buildCampaigns(campaigns)
  };
}
