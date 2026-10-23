import { z } from 'zod';

// Validation pieces shared by several modules.

export const categorySchema = z.enum([
  'ENVIRONMENT', 'EDUCATION', 'HEALTHCARE', 'ANIMAL_WELFARE',
  'WOMEN_EMPOWERMENT', 'CHILD_WELFARE', 'DISASTER_RELIEF'
]);

export const listQuerySchema = z.object({
  category: categorySchema.optional(),
  search: z.string().trim().max(100).optional(),
  city: z.string().trim().max(40).optional()
});

export const emailSchema = z.string().trim().toLowerCase().email();
