import type { ToObjectOptions } from 'mongoose';

export const CATEGORIES = [
  'Environment', 'Education', 'Healthcare', 'Animal Welfare',
  'Women Empowerment', 'Child Welfare', 'Disaster Relief'
] as const;

export const AVAILABILITY = ['Weekends', 'Weekdays', 'Weekday Evenings', 'Flexible'] as const;

/**
 * Clean JSON output for every model: "id" instead of "_id", no "__v", never a password hash.
 * Use it inline in each schema:  { timestamps: true, toJSON: jsonOptions }
 * (writing the options inline keeps Mongoose's TypeScript types accurate)
 */
export const jsonOptions: ToObjectOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  }
};
