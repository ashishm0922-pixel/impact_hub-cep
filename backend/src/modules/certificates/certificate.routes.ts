import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireUser } from '../../middlewares/auth';
import { DonationModel } from '../../models/campaign.model';
import { CertificateModel } from '../../models/certificate.model';
import { RegistrationModel } from '../../models/opportunity.model';
import { HttpError } from '../../utils/http-error';
import { audit } from '../audit/audit.service';
import { COUNTED_DONATION } from '../catalog/catalog.service';

/**
 * Participation certificates: volunteers and donors only.
 *   POST /api/me/certificate            → issue (or refresh) my certificate from my real records
 *   GET  /api/certificates/verify/:code → PUBLIC: anyone can check a certificate is genuine
 */
export const certificateRoutes = Router();

// Readable code without look-alike characters (no 0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  const bytes = randomBytes(10);
  const chars = Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `HC-${chars.slice(0, 5)}-${chars.slice(5)}`;
}

/** What this user has really done, taken from the database (never from the browser). */
async function myTotals(userId: unknown, kind: 'volunteer' | 'donor') {
  if (kind === 'volunteer') {
    const [row] = await RegistrationModel.aggregate<{ hours: number; events: number }>([
      { $match: { user: userId, status: 'attended' } },
      { $group: { _id: null, hours: { $sum: '$hours' }, events: { $sum: 1 } } }
    ]);
    return { hours: row?.hours ?? 0, events: row?.events ?? 0, amount: 0, campaigns: 0 };
  }
  const [row] = await DonationModel.aggregate<{ paise: number; campaigns: unknown[] }>([
    { $match: { ...COUNTED_DONATION, user: userId } },
    { $group: { _id: null, paise: { $sum: '$amountPaise' }, campaigns: { $addToSet: '$campaign' } } }
  ]);
  return { hours: 0, events: 0, amount: Math.round((row?.paise ?? 0) / 100), campaigns: row?.campaigns.length ?? 0 };
}

certificateRoutes.post('/me/certificate', requireUser, async (req, res) => {
  const user = req.user!;
  if (user.role !== 'volunteer' && user.role !== 'donor') {
    throw new HttpError(403, 'Participation certificates are for volunteers and donors only.', { code: 'WRONG_ROLE' });
  }
  if (!user.emailVerified) {
    throw new HttpError(403, 'Please verify your email before getting a certificate.', { code: 'EMAIL_NOT_VERIFIED' });
  }

  const totals = await myTotals(user._id, user.role);
  const earned = user.role === 'volunteer' ? totals.hours > 0 : totals.amount > 0;
  if (!earned) {
    throw new HttpError(409, user.role === 'volunteer'
      ? 'No confirmed hours yet. Your certificate unlocks after an NGO marks you as Attended.'
      : 'No pledges yet. Your certificate unlocks after your first pledge.', { code: 'NOT_ELIGIBLE' });
  }

  // One certificate per account: the code stays the same, the numbers are refreshed
  const existing = await CertificateModel.findOne({ user: user._id });
  const certificate = existing ?? new CertificateModel({ user: user._id, code: newCode() });
  Object.assign(certificate, {
    kind: user.role,
    recipientName: user.name,
    anonymous: Boolean(user.anonymous),
    ...totals,
    issuedAt: existing?.issuedAt ?? new Date()
  });
  await certificate.save();
  if (!existing) await audit(req, 'CERTIFICATE_ISSUED', { target: { type: 'Certificate', id: certificate._id }, details: { kind: user.role } });
  res.status(existing ? 200 : 201).json({ certificate: certificate.toJSON() });
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many checks. Please wait a minute.', code: 'RATE_LIMITED' }
});

certificateRoutes.get('/certificates/verify/:code', verifyLimiter, async (req, res) => {
  const code = z.string().trim().toUpperCase().regex(/^HC-[A-Z2-9]{5}-[A-Z2-9]{5}$/, 'That is not a valid certificate code.').parse(req.params.code);
  const certificate = await CertificateModel.findOne({ code });
  if (!certificate) throw new HttpError(404, 'No certificate with this code exists.', { code: 'NOT_FOUND' });
  const who = certificate.kind === 'volunteer' ? 'Volunteer' : 'Donor';
  res.json({
    valid: true,
    code: certificate.code,
    kind: certificate.kind,
    // an anonymous account stays anonymous here too
    recipient: certificate.anonymous ? `Anonymous ${who}` : certificate.recipientName,
    hours: certificate.hours,
    events: certificate.events,
    amount: certificate.amount,
    campaigns: certificate.campaigns,
    issuedAt: certificate.issuedAt
  });
});
