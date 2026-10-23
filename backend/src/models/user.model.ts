import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { jsonOptions } from './shared';

export const USER_ROLES = ['volunteer', 'donor', 'ngo'] as const;

/**
 * pending   → just signed up, waiting for an admin
 * approved  → can log in
 * rejected  → admin declined the sign-up
 * suspended → was approved, then blocked by an admin
 */
export const USER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
    // select: false → the hash is never loaded unless a query explicitly asks for it
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'volunteer' },
    status: { type: String, enum: USER_STATUSES, default: 'pending', index: true },
    statusReason: { type: String, maxlength: 200 },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
