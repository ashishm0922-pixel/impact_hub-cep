/**
 * Converts database documents into the exact shapes the website already uses
 * (frontend/assets/js/core/store.js), so the pages didn't need rewriting.
 */
import { toISODate } from '../../utils/dates';

type Doc = Record<string, any>;

const NGO_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected'
};

export const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  registered: 'Registered',
  attended: 'Attended',
  'no-show': 'No-show',
  cancelled: 'Cancelled'
};

export function ngoDto(ngo: Doc) {
  return {
    id: String(ngo._id),
    name: ngo.name,
    category: ngo.category,
    location: ngo.location,
    description: ngo.description,
    email: ngo.email,
    website: ngo.website || '',
    registrationNumber: ngo.registrationNumber || '',
    foundedYear: ngo.foundedYear ?? null,
    logo: ngo.logoUrl || '',
    banner: ngo.bannerUrl || '',
    verified: ngo.status === 'verified',
    status: NGO_STATUS_LABEL[ngo.status] || ngo.status,
    statusReason: ngo.statusReason || '',
    rating: null,
    submittedAt: toISODate(ngo.createdAt)
  };
}

export function opportunityDto(opp: Doc, ngo: Doc | undefined, registeredCount: number) {
  return {
    id: String(opp._id),
    title: opp.title,
    ngoId: String(opp.ngo),
    ngoName: ngo?.name || 'Unknown NGO',
    category: opp.category,
    location: opp.location,
    city: opp.city,
    date: toISODate(opp.date),
    recurring: opp.recurring || null,
    availability: opp.availability,
    hours: opp.hours,
    volunteersNeeded: opp.volunteersNeeded,
    volunteersRegistered: registeredCount,
    skillLevel: opp.skillLevel || 'Open for all',
    skills: opp.skills || [],
    remote: Boolean(opp.remote),
    status: opp.status === 'closed' ? 'Closed' : 'Open',
    image: opp.imageUrl || ngo?.bannerUrl || '',
    description: opp.description
  };
}

export function campaignDto(campaign: Doc, ngo: Doc | undefined, pledged: { paise: number; count: number }) {
  return {
    id: String(campaign._id),
    title: campaign.title,
    ngoId: String(campaign.ngo),
    ngoName: ngo?.name || 'Unknown NGO',
    category: campaign.category,
    location: campaign.location,
    raised: Math.round(((campaign.baselineRaisedPaise || 0) + pledged.paise) / 100),
    goal: Math.round(campaign.goalPaise / 100),
    supporters: (campaign.baselineSupporters || 0) + pledged.count,
    image: campaign.imageUrl || ngo?.bannerUrl || '',
    description: campaign.description,
    featured: Boolean(campaign.featured),
    endDate: toISODate(campaign.endDate),
    status: campaign.status === 'closed' ? 'Closed' : 'Active'
  };
}

export function registrationDto(reg: Doc, opp: Doc | undefined, ngo: Doc | undefined) {
  return {
    id: String(reg._id),
    opportunityId: String(reg.opportunity),
    opportunityTitle: opp?.title || 'Deleted drive',
    ngoId: opp ? String(opp.ngo) : '',
    ngoName: ngo?.name || '',
    category: opp?.category || '',
    eventDate: toISODate(opp?.date),
    hours: reg.hours,
    name: reg.name,
    email: reg.email,
    phone: reg.phone,
    skills: reg.skills || '',
    availability: reg.availability,
    dateApplied: toISODate(reg.createdAt),
    status: REGISTRATION_STATUS_LABEL[reg.status] || reg.status
  };
}

export function pledgeDto(donation: Doc, campaign: Doc | undefined, ngo: Doc | undefined) {
  return {
    id: String(donation._id),
    campaignId: String(donation.campaign),
    campaignTitle: campaign?.title || 'Deleted campaign',
    ngoId: campaign ? String(campaign.ngo) : '',
    ngoName: ngo?.name || '',
    category: campaign?.category || '',
    amount: Math.round(donation.amountPaise / 100),
    date: toISODate(donation.createdAt),
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    reference: donation.reference,
    status: donation.status,
    isDemo: donation.status === 'pledged'
  };
}
