import type { Request } from 'express';
import { AuditLogModel } from '../../models/audit-log.model';

interface AuditOptions {
  target?: { type: string; id: unknown };
  details?: Record<string, unknown>;
  /** Override the actor (e.g. for a login, where req.user isn't set yet) */
  actor?: { type: 'user' | 'admin' | 'system' | 'anonymous'; id?: unknown; name?: string; role?: string };
}

/**
 * Writes one audit log entry. Never throws: a logging problem must not break the request.
 *   audit(req, 'NGO_VERIFIED', { target: { type: 'Ngo', id: ngo._id }, details: { name } })
 */
export async function audit(req: Request | null, action: string, options: AuditOptions = {}) {
  try {
    const actor = options.actor ?? (req?.admin
      ? { type: 'admin' as const, id: req.admin._id, name: req.admin.username, role: 'admin' }
      : req?.user
        ? { type: 'user' as const, id: req.user._id, name: req.user.name, role: req.user.role }
        : { type: 'anonymous' as const });

    await AuditLogModel.create({
      action,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetType: options.target?.type,
      targetId: options.target?.id ? String(options.target.id) : undefined,
      details: options.details,
      ip: req?.ip,
      userAgent: req?.get('user-agent')?.slice(0, 300)
    });
  } catch (err) {
    console.error('Audit log failed:', err instanceof Error ? err.message : err);
  }
}
