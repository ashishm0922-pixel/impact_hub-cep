import { Schema, model } from 'mongoose';
import { jsonOptions } from './shared';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true },
    subject: { type: String, maxlength: 120 },
    message: { type: String, required: true, maxlength: 2000 }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export const ContactMessageModel = model('ContactMessage', contactMessageSchema);
