import { DonationModel } from '../../models/campaign.model';
import { NgoModel } from '../../models/ngo.model';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { UserModel } from '../../models/user.model';
import { COUNTED_DONATION } from '../catalog/catalog.service';

/** Points → badge tier (same tiers for everyone) */
export function badgeTier(points: number) {
  if (points >= 1000) return 'Platinum';
  if (points >= 500) return 'Gold';
  if (points >= 200) return 'Silver';
  return 'Bronze';
}

const key = (id: unknown) => String(id);

/** Volunteers: 10 points per attended hour. Only ATTENDED (organizer-confirmed) hours count. */
export async function volunteerLeaderboard(limit = 50) {
  const [users, hours] = await Promise.all([
    UserModel.find({ role: 'volunteer', status: 'approved' }).select('name email createdAt').lean(),
    RegistrationModel.aggregate<{ _id: unknown; hours: number; events: number }>([
      { $match: { status: 'attended', user: { $ne: null } } },
      { $group: { _id: '$user', hours: { $sum: '$hours' }, events: { $sum: 1 } } }
    ])
  ]);
  const byUser = new Map(hours.map(h => [key(h._id), h]));
  return users
    .map(u => {
      const h = byUser.get(key(u._id));
      const points = (h?.hours || 0) * 10;
      return { id: key(u._id), name: u.name, email: u.email, hours: h?.hours || 0, events: h?.events || 0, points, tier: badgeTier(points), joined: u.createdAt };
    })
    .sort((a, b) => b.points - a.points || +new Date(a.joined!) - +new Date(b.joined!))
    .slice(0, limit)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

/** Donors: 1 point per ₹100 pledged/donated. */
export async function donorLeaderboard(limit = 50) {
  const rows = await DonationModel.aggregate<{ _id: unknown; paise: number; count: number; campaigns: unknown[] }>([
    { $match: { ...COUNTED_DONATION, user: { $ne: null } } },
    { $group: { _id: '$user', paise: { $sum: '$amountPaise' }, count: { $sum: 1 }, campaigns: { $addToSet: '$campaign' } } },
    { $sort: { paise: -1 } },
    { $limit: limit }
  ]);
  const users = await UserModel.find({ _id: { $in: rows.map(r => r._id) } }).select('name email').lean();
  const byId = new Map(users.map(u => [key(u._id), u]));
  return rows.map((r, i) => {
    const amount = Math.round(r.paise / 100);
    const points = Math.floor(amount / 100);
    return {
      rank: i + 1,
      id: key(r._id),
      name: byId.get(key(r._id))?.name || 'Deleted user',
      email: byId.get(key(r._id))?.email || '',
      amount,
      pledges: r.count,
      campaignsSupported: r.campaigns.length,
      points,
      tier: badgeTier(points)
    };
  });
}

/** NGOs: 10 points per volunteer hour delivered + 1 point per ₹1,000 raised. */
export async function ngoLeaderboard(limit = 50) {
  const ngos = await NgoModel.find({ status: 'verified' }).select('name location category').lean();
  const opps = await OpportunityModel.find({ ngo: { $in: ngos.map(n => n._id) } }).select('ngo').lean();
  const oppNgo = new Map(opps.map(o => [key(o._id), key(o.ngo)]));

  const attended = await RegistrationModel.aggregate<{ _id: unknown; hours: number; people: number }>([
    { $match: { status: 'attended', opportunity: { $in: opps.map(o => o._id) } } },
    { $group: { _id: '$opportunity', hours: { $sum: '$hours' }, people: { $sum: 1 } } }
  ]);
  const raised = await DonationModel.aggregate<{ _id: unknown; paise: number }>([
    { $match: COUNTED_DONATION },
    { $lookup: { from: 'campaigns', localField: 'campaign', foreignField: '_id', as: 'c' } },
    { $unwind: '$c' },
    { $group: { _id: '$c.ngo', paise: { $sum: '$amountPaise' } } }
  ]);

  const stats = new Map<string, { hours: number; volunteers: number; raised: number }>();
  for (const n of ngos) stats.set(key(n._id), { hours: 0, volunteers: 0, raised: 0 });
  for (const a of attended) {
    const s = stats.get(oppNgo.get(key(a._id)) || '');
    if (s) { s.hours += a.hours; s.volunteers += a.people; }
  }
  for (const r of raised) {
    const s = stats.get(key(r._id));
    if (s) s.raised += Math.round(r.paise / 100);
  }

  return ngos
    .map(n => {
      const s = stats.get(key(n._id))!;
      const points = s.hours * 10 + Math.floor(s.raised / 1000);
      return { id: key(n._id), name: n.name, location: n.location, category: n.category, ...s, points, tier: badgeTier(points) };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row, i) => ({ rank: i + 1, ...row }));
}
