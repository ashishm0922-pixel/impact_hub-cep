import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CATEGORIES, jsonOptions } from './shared';

/**
 * pending  → submitted by an NGO account, waiting for an admin
 * verified → can publish drives and campaigns
 * rejected → declined (statusReason explains why)
 */
export const NGO_STATUSES = ['pending', 'verified', 'rejected'] as const;

const ngoSchema = new Schema(
  {
    // The NGO user account that manages this organization (empty for sample data)
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, unique: true },
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    location: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true },
    website: { type: String },
    registrationNumber: { type: String, maxlength: 40 },
    description: { type: String, required: true, maxlength: 600 },
    foundedYear: { type: Number },
    logoUrl: { type: String },
    bannerUrl: { type: String },
    status: { type: String, enum: NGO_STATUSES, default: 'pending', index: true },
    statusReason: { type: String, maxlength: 200 },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    isSample: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export type Ngo = InferSchemaType<typeof ngoSchema>;
export type NgoDocument = HydratedDocument<Ngo>;
export const NgoModel = model('Ngo', ngoSchema);
