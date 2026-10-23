import { Router } from 'express';
import { env } from '../../config/env';
import { requireAdmin } from '../../middlewares/auth';
import { loginLimiter } from '../../middlewares/security';
import { USER_STATUSES, UserModel } from '../../models/user.model';
import { escapeRegex, objectIdSchema } from '../../shared/schemas';
import { HttpError } from '../../utils/http-error';
import { publicUser } from '../auth/auth.service';
import { endAllSessions, endSession, startSession } from '../auth/session.service';
import { adminLoginSchema, listUsersQuerySchema, updateUserStatusSchema } from './admin.schemas';
import { authenticateAdmin } from './admin.service';

const PAGE_SIZE = 20;

/** /api/admin/* — admin login and user approval. */
export function createAdminRoutes(options: { loginLimit?: number } = {}) {
  const router = Router();

  // ---------- Admin auth ----------

  // POST /api/admin/auth/login  { username, password }
  router.post('/auth/login', loginLimiter(options.loginLimit), async (req, res) => {
    const { username, password } = adminLoginSchema.parse(req.body);
    const admin = await authenticateAdmin(username, password);
    await endSession('admin', req, res);
    await startSession('admin', admin._id, req, res);
    res.json({ message: 'Logged in as admin.', admin: { id: String(admin._id), username: admin.username } });
  });

  router.post('/auth/logout', async (req, res) => {
    await endSession('admin', req, res);
    res.json({ message: 'Admin logged out.' });
  });

  router.get('/auth/me', requireAdmin, (req, res) => {
    res.json({ admin: { id: String(req.admin!._id), username: req.admin!.username } });
  });

  // ---------- User approval (everything below needs an admin session) ----------

  // GET /api/admin/users?status=pending&search=&page=1
  router.get('/users', requireAdmin, async (req, res) => {
    const { status, search, page } = listUsersQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const [users, total, statusCounts] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
      UserModel.countDocuments(filter),
      UserModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const counts = Object.fromEntries(USER_STATUSES.map(s => [s, 0])) as Record<string, number>;
    statusCounts.forEach(c => { counts[c._id] = c.count; });

    res.json({
      users: users.map(u => ({ ...publicUser(u), statusReason: u.statusReason, reviewedAt: u.reviewedAt, lastLoginAt: u.lastLoginAt })),
      requireAdminApproval: env.requireAdminApproval,
      total,
      page,
      pageSize: PAGE_SIZE,
      counts
    });
  });

  // PATCH /api/admin/users/:id/status  { status: approved | rejected | suspended, reason? }
  router.patch('/users/:id/status', requireAdmin, async (req, res) => {
    const id = objectIdSchema.parse(req.params.id);
    const { status, reason } = updateUserStatusSchema.parse(req.body);

    if (status !== 'approved' && !reason) {
      throw new HttpError(400, 'Please give a short reason.', {
        code: 'VALIDATION_ERROR',
        fields: [{ field: 'reason', message: 'Please give a short reason.' }]
      });
    }

    const user = await UserModel.findById(id);
    if (!user) throw new HttpError(404, 'User not found.', { code: 'NOT_FOUND' });

    user.status = status;
    user.statusReason = status === 'approved' ? undefined : reason;
    user.reviewedAt = new Date();
    user.reviewedBy = req.admin!._id;
    await user.save();

    // A rejected or suspended user is logged out of every device immediately
    if (status !== 'approved') await endAllSessions('user', user._id);

    res.json({ message: `${user.name} is now ${status}.`, user: publicUser(user) });
  });

  return router;
}
