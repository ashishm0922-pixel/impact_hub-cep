import { z } from 'zod';
import { emailSchema } from '../../shared/schemas';

const phoneSchema = z.string().trim().refine(value => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}, 'Enter a valid phone number (10–13 digits).');

// Same rules as the frontend registration form (frontend/assets/js/pages/volunteer.js)
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  phone: phoneSchema,
  skills: z.string().trim().max(200).optional(),
  availability: z.enum(['WEEKENDS', 'WEEKDAYS', 'WEEKDAY_EVENINGS', 'FLEXIBLE']).default('FLEXIBLE')
});
