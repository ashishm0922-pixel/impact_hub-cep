import { z } from 'zod';
import { categorySchema, emailSchema } from '../../shared/schemas';

// Same rules as the frontend NGO registration form (frontend/assets/js/pages/contact.js)
export const ngoApplicationSchema = z.object({
  name: z.string({ required_error: 'Organization name is required.' }).trim()
    .min(3, 'Organization name must be at least 3 characters.').max(80, 'Organization name is too long.'),
  category: categorySchema,
  location: z.string({ required_error: 'Location is required.' }).trim()
    .min(3, 'Location must be at least 3 characters.').max(80, 'Location is too long.'),
  email: emailSchema,
  website: z.string().trim().url('Enter a full URL starting with https://').startsWith('http', 'Enter a full URL starting with https://')
    .optional().or(z.literal('')),
  foundedYear: z.number({ invalid_type_error: 'Year founded must be a number.' }).int()
    .min(1850, 'Enter a year after 1850.').max(new Date().getFullYear(), 'Year founded cannot be in the future.'),
  description: z.string({ required_error: 'Description is required.' }).trim()
    .min(40, 'Description must be at least 40 characters.').max(600, 'Description is too long.')
});
