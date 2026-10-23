import { z } from 'zod';
import { categorySchema, emailSchema } from '../../shared/schemas';

// Same rules as the frontend NGO registration form (frontend/assets/js/pages/contact.js)
export const ngoApplicationSchema = z.object({
  name: z.string().trim().min(3).max(80),
  category: categorySchema,
  location: z.string().trim().min(3).max(80),
  email: emailSchema,
  website: z.string().trim().url().startsWith('http').optional().or(z.literal('')),
  foundedYear: z.number().int().min(1850).max(new Date().getFullYear()),
  description: z.string().trim().min(40).max(600)
});
