import { z } from 'zod';
import { AVAILABILITY } from '../../models/shared';

// Name, email and phone come from the logged-in account, so only these are sent.
export const registrationSchema = z.object({
  skills: z.string().trim().max(200, 'Keep skills under 200 characters.').optional(),
  availability: z.enum(AVAILABILITY).default('Flexible')
});
