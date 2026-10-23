import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middlewares/auth';
import { AuditLogModel } from '../../models/audit-log.model';
import { CampaignModel, DonationModel } from '../../models/campaign.model';
import { NgoModel, NGO_STATUSES } from '../../models/ngo.model';
import { OpportunityModel, RegistrationModel } from '../../models/opportunity.model';
import { ReportModel } from '../../models/report.model';
import { UserModel } from '../../models/user.model';
import { escapeRegex, objectIdSchema } from '../../shared/schemas';
import { todayISODate, fromISODate } from '../../utils/dates';
import { HttpError } from '../../utils/http-error';
import { audit } from '../audit/audit.service';
import { COUNTED_DONATION } from '../catalog/catalog.service';
import { ngoDto } from '../catalog/catalog.dto';
import { donorLeaderboard, ngoLeaderboard, volunteerLeaderboard } from './leaderboard.service';

/** Admin dashboard data: overview, NGO verification, audit logs, leaderboard, flagged content. */
export const adminDashboardRoutes = Router();
adminDashboardRoutes.use(requireAdmin);

const PAGE_SIZE = 25;

/* ---------------- Overview ---------------- */
adminDashboardRoutes.get('/overview', async (_req, res) => {
  const today = fromISODate(todayISODate());
  const [usersByRole, ngosByStatus, donations, hours, liveDrives, liveCampaigns, auditEvents, openReports, pendingUsers] = await Promise.all([
    UserModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    NgoModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    DonationModel.aggregate<{ _id: string; paise: number; count: number }>([
      { $match: COUNTED_DONATION },
      { $group: { _id: '$status', paise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
    ]),
    RegistrationModel.aggregate<{ _id: null; hours: number; people: number[] }>([
      { $match: { status: 'attended' } },
      { $group: { _id: null, hours: { $sum: '$hours' }, people: { $addToSet: '$user' } } }
    ]),
    OpportunityModel.countDocuments({ status: 'open', $or: [{ date: { $gte: today } }, { recurring: { $nin: [null, ''] } }] }),
    CampaignModel.countDocuments({ status: 'active', endDate: { $gt: today } }),
    AuditLogModel.estimatedDocumentCount(),
    ReportModel.countDocuments({ status: 'open' }),
    UserModel.countDocuments({ status: 'pending' })
  ]);

  const roles = Object.fromEntries(usersByRole.map(r => [r._id, r.count]));
  const ngos = Object.fromEntries(ngosByStatus.map(r => [r._id, r.count]));
  const pledged = donations.find(d => d._id === 'pledged');
  const paid = donations.find(d => d._id === 'succeeded');

  res.json({
    users: { total: usersByRole.reduce((s, r) => s + r.count, 0), volunteers: roles.volunteer || 0, donors: roles.donor || 0, ngos: roles.ngo || 0, pending: pendingUsers },
    ngos: { total: NGO_STATUSES.reduce((s, k) => s + (ngos[k] || 0), 0), verified: ngos.verified || 0, pending: ngos.pending || 0, rejected: ngos.rejected || 0 },
    donations: {
      paidAmount: Math.round((paid?.paise || 0) / 100), paidCount: paid?.count || 0,
      pledgedAmount: Math.round((pledged?.paise || 0) / 100), pledgedCount: pledged?.count || 0
    },
    volunteering: { hours: hours[0]?.hours || 0, activeVolunteers: hours[0]?.people.filter(Boolean).length || 0 },
    live: { drives: liveDrives, campaigns: liveCampaigns },
    audit: { events: auditEvents },
    reports: { open: openReports }
  });
});

/* ---------------- NGO verification queue ---------------- */
const ngoListSchema = z.object({
  status: z.enum(NGO_STATUSES).optional(),
  search: z.string().trim().max(100).optional()
});

adminDashboardRoutes.get('/ngos', async (req, res) => {
  const { status, search } = ngoListSchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { location: pattern }, { registrationNumber: pattern }, { email: pattern }];
  }
  const [ngos, counts] = await Promise.all([
    NgoModel.find(filter).sort({ status: 1, createdAt: -1 }).limit(200).populate('owner', 'name email phone').lean(),
    NgoModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  res.json({
    ngos: ngos.map(n => {
      const owner = n.owner as unknown as { name?: string; email?: string; phone?: string } | null;
      return { ...ngoDto(n), statusKey: n.status, isSample: n.isSample, submitter: owner ? { name: owner.name, email: owner.email, phone: owner.phone } : null };
    }),
    counts: Object.fromEntries(NGO_STATUSES.map(s => [s, counts.find(c => c._id === s)?.count || 0]))
  });
});

const ngoDecisionSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reason: z.string().trim().max(200, 'Reason must be at most 200 characters.').optional()
});

adminDashboardRoutes.patch('/ngos/:id/status', async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const { status, reason } = ngoDecisionSchema.parse(req.body);
  if (status === 'rejected' && !reason) {
    throw new HttpError(400, 'Please give a short reason.', { code: 'VALIDATION_ERROR', fields: [{ field: 'reason', message: 'Please give a short reason.' }] });
  }
  const ngo = await NgoModel.findById(id);
  if (!ngo) throw new HttpError(404, 'NGO not found.', { code: 'NOT_FOUND' });

  ngo.status = status;
  ngo.statusReason = status === 'rejected' ? reason : undefined;
  ngo.reviewedAt = new Date();
  ngo.reviewedBy = req.admin!._id;
  await ngo.save();

  await audit(req, status === 'verified' ? 'NGO_VERIFIED' : 'NGO_REJECTED', { target: { type: 'Ngo', id: ngo._id }, details: { name: ngo.name, reason } });
  res.json({ message: `${ngo.name} is now ${status}.`, ngo: ngoDto(ngo.toObject()) });
});

/* ---------------- Audit logs ---------------- */
const auditQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  action: z.string().trim().regex(/^[A-Z_]{2,40}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1)
});

function auditFilter(query: z.infer<typeof auditQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.action) filter.action = query.action;
  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.$gte = new Date(`${query.from}T00:00:00`);
    if (query.to) range.$lte = new Date(`${query.to}T23:59:59.999`);
    filter.createdAt = range;
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ action: pattern }, { actorName: pattern }, { actorRole: pattern }, { targetType: pattern }, { targetId: pattern }, { ip: pattern }];
  }
  return filter;
}

function auditRow(log: Record<string, any>) {
  return {
    id: String(log._id),
    timestamp: log.createdAt,
    action: log.action,
    actorType: log.actorType,
    actorName: log.actorName || (log.actorType === 'anonymous' ? 'Anonymous' : ''),
    actorRole: log.actorRole || log.actorType,
    targetType: log.targetType || '',
    targetId: log.targetId || '',
    details: log.details ? JSON.stringify(log.details) : '',
    ip: log.ip || ''
  };
}

adminDashboardRoutes.get('/audit-logs', async (req, res) => {
  const query = auditQuerySchema.parse(req.query);
  const filter = auditFilter(query);
  const [logs, total, actions] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    AuditLogModel.countDocuments(filter),
    AuditLogModel.distinct('action')
  ]);
  res.json({ logs: logs.map(auditRow), total, page: query.page, pageSize: PAGE_SIZE, actions: actions.sort() });
});

// Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so they stay text
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

adminDashboardRoutes.get('/audit-logs/export', async (req, res) => {
  const query = auditQuerySchema.parse(req.query);
  const logs = await AuditLogModel.find(auditFilter(query)).sort({ createdAt: -1 }).limit(10000).lean();
  const header = ['Timestamp', 'Action', 'Actor', 'Role', 'Target type', 'Target id', 'Details', 'IP'];
  const lines = logs.map(auditRow).map(r =>
    [new Date(r.timestamp).toISOString(), r.action, r.actorName, r.actorRole, r.targetType, r.targetId, r.details, r.ip].map(csvCell).join(','));
  await audit(req, 'AUDIT_EXPORTED', { details: { rows: logs.length } });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hopeconnect-audit-${todayISODate()}.csv"`);
  res.send('﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n'));
});

/* ---------------- Leaderboard ---------------- */
adminDashboardRoutes.get('/leaderboard', async (req, res) => {
  const { type } = z.object({ type: z.enum(['volunteers', 'donors', 'ngos']).default('volunteers') }).parse(req.query);
  const rows = type === 'donors' ? await donorLeaderboard() : type === 'ngos' ? await ngoLeaderboard() : await volunteerLeaderboard();
  res.json({ type, rows });
});

/* ---------------- Flagged content ---------------- */
adminDashboardRoutes.get('/reports', async (req, res) => {
  const { status } = z.object({ status: z.enum(['open', 'dismissed', 'actioned']).optional() }).parse(req.query);
  const reports = await ReportModel.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200).populate('reporter', 'name email').lean();
  const counts = await ReportModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.json({
    reports: reports.map(r => {
      const reporter = r.reporter as unknown as { name?: string; email?: string } | null;
      return {
        id: String(r._id), targetType: r.targetType, targetId: String(r.targetId), targetName: r.targetName,
        reason: r.reason, details: r.details || '', status: r.status, resolutionNote: r.resolutionNote || '',
        reporter: reporter ? { name: reporter.name, email: reporter.email } : null, createdAt: r.createdAt
      };
    }),
    counts: Object.fromEntries(['open', 'dismissed', 'actioned'].map(s => [s, counts.find(c => c._id === s)?.count || 0]))
  });
});

const reportDecisionSchema = z.object({
  action: z.enum(['dismiss', 'takedown']),
  note: z.string().trim().max(200).optional()
});

// "takedown" hides the reported item: NGO → rejected, campaign/drive → closed
adminDashboardRoutes.patch('/reports/:id', async (req, res) => {
  const { action, note } = reportDecisionSchema.parse(req.body);
  const report = await ReportModel.findById(objectIdSchema.parse(req.params.id));
  if (!report) throw new HttpError(404, 'Report not found.', { code: 'NOT_FOUND' });
  if (report.status !== 'open') throw new HttpError(409, 'This report was already resolved.', { code: 'ALREADY_RESOLVED' });

  if (action === 'takedown') {
    const reason = note || 'Removed after a content report.';
    if (report.targetType === 'ngo') await NgoModel.updateOne({ _id: report.targetId }, { status: 'rejected', statusReason: reason, reviewedAt: new Date(), reviewedBy: req.admin!._id });
    if (report.targetType === 'campaign') await CampaignModel.updateOne({ _id: report.targetId }, { status: 'closed' });
    if (report.targetType === 'opportunity') await OpportunityModel.updateOne({ _id: report.targetId }, { status: 'closed' });
  }
  // Resolve every open report about the same item at once
  await ReportModel.updateMany(
    { targetType: report.targetType, targetId: report.targetId, status: 'open' },
    { status: action === 'takedown' ? 'actioned' : 'dismissed', resolutionNote: note, resolvedBy: req.admin!._id, resolvedAt: new Date() }
  );

  await audit(req, action === 'takedown' ? 'FLAG_TAKEDOWN' : 'FLAG_DISMISSED', {
    target: { type: report.targetType, id: report.targetId }, details: { name: report.targetName, note }
  });
  res.json({ message: action === 'takedown' ? `"${report.targetName}" was taken down.` : 'Report dismissed.' });
});
