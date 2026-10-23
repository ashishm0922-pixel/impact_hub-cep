import { Schema, model } from 'mongoose';
import { AVAILABILITY, CATEGORIES, jsonOptions } from './shared';

const opportunitySchema = new Schema(
  {
    ngo: { type: Schema.Types.ObjectId, ref: 'Ngo', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    category: { type: String, enum: CATEGORIES, required: true },
    city: { type: String, required: true, maxlength: 40 },
    location: { type: String, required: true, maxlength: 100 },
    date: { type: Date, required: true },
    recurring: { type: String },
    availability: { type: String, enum: AVAILABILITY, default: 'Flexible' },
    hours: { type: Number, required: true, min: 1, max: 12 },
    volunteersNeeded: { type: Number, required: true, min: 1, max: 500 },
    skills: [{ type: String, lowercase: true, trim: true }],
    skillLevel: { type: String, maxlength: 60, default: 'Open for all' },
    remote: { type: Boolean, default: false },
    imageUrl: { type: String },
    status: { type: String, enum: ['open', 'closed'], default: 'open' }
  },
  { timestamps: true, toJSON: jsonOptions }
);
opportunitySchema.index({ category: 1, date: 1 });

export const OpportunityModel = model('Opportunity', opportunitySchema);

const registrationSchema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    skills: { type: String, maxlength: 200 },
    availability: { type: String, enum: AVAILABILITY, default: 'Flexible' },
    status: { type: String, enum: ['registered', 'attended', 'no-show', 'cancelled'], default: 'registered' },
    hours: { type: Number, required: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);
// One registration per email per opportunity
registrationSchema.index({ opportunity: 1, email: 1 }, { unique: true });

export const RegistrationModel = model('Registration', registrationSchema);
