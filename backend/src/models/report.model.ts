import { Schema, model } from 'mongoose';
import { jsonOptions } from './shared';

export const REPORT_TARGETS = ['ngo', 'campaign', 'opportunity'] as const;
export const REPORT_REASONS = ['fraud', 'misleading', 'inappropriate', 'spam', 'other'] as const;

/** "Flagged content": a logged-in user reports an NGO, campaign or drive for an admin to review. */
const reportSchema = new Schema(
  {
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetName: { type: String },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 500 },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'dismissed', 'actioned'], default: 'open', index: true },
    resolutionNote: { type: String, maxlength: 200 },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    resolvedAt: { type: Date }
  },
  { timestamps: true, toJSON: jsonOptions }
);
// One open report per user per item (stops report spamming)
reportSchema.index(
  { reporter: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

export const ReportModel = model('Report', reportSchema);
