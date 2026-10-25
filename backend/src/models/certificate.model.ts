import { Schema, model } from 'mongoose';
import { jsonOptions } from './shared';

/**
 * A participation certificate. Only volunteers and donors get one (one per account).
 * The numbers are copied from the server's own records when it is issued, so they can't be edited in the browser.
 */
const certificateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    kind: { type: String, enum: ['volunteer', 'donor'], required: true },
    recipientName: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    // volunteer: confirmed hours + drives attended; donor: rupees pledged + campaigns supported
    hours: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    campaigns: { type: Number, default: 0 },
    issuedAt: { type: Date, required: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const CertificateModel = model('Certificate', certificateSchema);
