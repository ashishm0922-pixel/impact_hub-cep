import { z } from 'zod';

// Request body schemas. Same rules as the frontend forms (js/app.js validators).

export const categorySchema = z.enum([
  'ENVIRONMENT', 'EDUCATION', 'HEALTHCARE', 'ANIMAL_WELFARE',
  'WOMEN_EMPOWERMENT', 'CHILD_WELFARE', 'DISASTER_RELIEF'
]);

const phoneSchema = z.string().trim().refine(value => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}, 'Enter a valid phone number (10–13 digits).');

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema,
  skills: z.string().trim().max(200).optional(),
  availability: z.enum(['WEEKENDS', 'WEEKDAYS', 'WEEKDAY_EVENINGS', 'FLEXIBLE']).default('FLEXIBLE')
});

export const ngoApplicationSchema = z.object({
  name: z.string().trim().min(3).max(80),
  category: categorySchema,
  location: z.string().trim().min(3).max(80),
  email: z.string().trim().toLowerCase().email(),
  website: z.string().trim().url().startsWith('http').optional().or(z.literal('')),
  foundedYear: z.number().int().min(1850).max(new Date().getFullYear()),
  description: z.string().trim().min(40).max(600)
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(2000)
});

export const listQuerySchema = z.object({
  category: categorySchema.optional(),
  search: z.string().trim().max(100).optional(),
  city: z.string().trim().max(40).optional()
});
