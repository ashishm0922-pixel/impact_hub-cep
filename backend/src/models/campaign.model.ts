import { Schema, model } from 'mongoose';
import { CATEGORIES, jsonOptions } from './shared';

const campaignSchema = new Schema(
  {
    ngo: { type: Schema.Types.ObjectId, ref: 'Ngo', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 600 },
    category: { type: String, enum: CATEGORIES, required: true },
    location: { type: String, required: true },
    goalPaise: { type: Number, required: true, min: 100000 }, // money in paise (integers, no rounding errors)
    endDate: { type: Date, required: true },
    imageUrl: { type: String },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const CampaignModel = model('Campaign', campaignSchema);

/**
 * A donation is "succeeded" ONLY when the payment provider's verified webhook says so.
 * Payments are not connected yet, so nothing creates donations today.
 */
const donationSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true, lowercase: true },
    amountPaise: { type: Number, required: true, min: 1000 },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
    provider: { type: String },
    providerOrderId: { type: String, unique: true, sparse: true },
    providerPaymentId: { type: String, unique: true, sparse: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const DonationModel = model('Donation', donationSchema);
