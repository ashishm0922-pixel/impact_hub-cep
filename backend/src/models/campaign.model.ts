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
    // Starting figures for sample campaigns only (shown as demo figures)
    baselineRaisedPaise: { type: Number, default: 0 },
    baselineSupporters: { type: Number, default: 0 },
    endDate: { type: Date, required: true },
    imageUrl: { type: String },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const CampaignModel = model('Campaign', campaignSchema);

/**
 * Money given to a campaign.
 *  - "pledged":   DEMO pledge recorded by a logged-in user — NO money moved (payments not connected yet)
 *  - "succeeded": a real payment confirmed by the payment provider's verified webhook (future)
 */
const donationSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true, lowercase: true },
    amountPaise: { type: Number, required: true, min: 1000 },
    status: { type: String, enum: ['pledged', 'pending', 'succeeded', 'failed', 'refunded'], default: 'pledged' },
    reference: { type: String, required: true },
    provider: { type: String },
    providerOrderId: { type: String, unique: true, sparse: true },
    providerPaymentId: { type: String, unique: true, sparse: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const DonationModel = model('Donation', donationSchema);
