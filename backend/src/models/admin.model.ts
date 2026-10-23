import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { jsonOptions } from './shared';

// Admins are stored separately from normal users and log in with a username.
const adminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export type Admin = InferSchemaType<typeof adminSchema>;
export type AdminDocument = HydratedDocument<Admin>;
export const AdminModel = model('Admin', adminSchema);
