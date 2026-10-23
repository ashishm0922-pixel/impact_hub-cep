import { Schema, model } from 'mongoose';

/**
 * A login session. The browser holds the random token (httpOnly cookie);
 * we store only its SHA-256 hash. Deleting the document logs that device out.
 */
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['user', 'admin'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    // MongoDB deletes the document automatically once this time has passed (TTL index)
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 }
  },
  { timestamps: true }
);

export const SessionModel = model('Session', sessionSchema);
