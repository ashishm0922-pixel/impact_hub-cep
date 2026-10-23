import { Schema, model } from 'mongoose';

/**
 * One-time token for the "verify your email" link.
 * Only the SHA-256 hash is stored; the real token exists only inside the email.
 * MongoDB deletes expired tokens automatically (TTL index on expiresAt).
 */
const emailTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['verify-email'], required: true },
    email: { type: String, required: true }, // the address the link was sent to
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export const EmailTokenModel = model('EmailToken', emailTokenSchema);
