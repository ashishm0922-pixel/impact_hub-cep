import { Schema, model } from 'mongoose';
import { CATEGORIES, jsonOptions } from './shared';

const ngoSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    location: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true },
    website: { type: String },
    description: { type: String, required: true, maxlength: 600 },
    foundedYear: { type: Number },
    logoUrl: { type: String },
    bannerUrl: { type: String },
    // New NGOs always start as pending; an admin verifies them
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
    verifiedAt: { type: Date }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const NgoModel = model('Ngo', ngoSchema);
