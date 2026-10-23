import { z } from 'zod';
import { emailSchema } from '../../shared/schemas';

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(2000)
});
