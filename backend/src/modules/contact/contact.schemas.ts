import { z } from 'zod';
import { emailSchema, nameSchema } from '../../shared/schemas';

export const contactMessageSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().trim().max(120, 'Subject is too long.').optional(),
  message: z.string({ required_error: 'Message is required.' }).trim()
    .min(10, 'Message must be at least 10 characters.').max(2000, 'Message is too long.')
});
