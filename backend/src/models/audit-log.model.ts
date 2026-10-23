import { Schema, model } from 'mongoose';

/**
 * Append-only security & activity log. There is NO update or delete route for it,
 * so admins can trust what happened and when. Never put passwords or tokens in `details`.
 */
const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. LOGIN_SUCCESS, NGO_VERIFIED
    actorType: { type: String, enum: ['user', 'admin', 'system', 'anonymous'], required: true },
    actorId: { type: Schema.Types.ObjectId },
    actorName: { type: String },
    actorRole: { type: String },
    targetType: { type: String }, // User, Ngo, Opportunity, Campaign, Report...
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String, maxlength: 300 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model('AuditLog', auditLogSchema);
