import { z } from 'zod';
import { USER_ROLES } from '../../models/user.model';
import { PHONE_REGEX, emailSchema, nameSchema, passwordSchema, phoneSchema } from '../../shared/schemas';

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    role: z.enum(USER_ROLES, { errorMap: () => ({ message: 'Choose Volunteer, Donor or NGO.' }) }).default('volunteer'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password.' })
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.'
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Login with EITHER email OR 10-digit mobile number, plus password.
 * Returns { email } or { phone } so the service knows which field to search.
 */
export const loginSchema = z
  .object({
    identifier: z
      .string({ required_error: 'Enter your email or mobile number.' })
      .trim()
      .min(1, 'Enter your email or mobile number.')
      .max(254, 'Enter a valid email or 10-digit mobile number.'),
    password: z
      .string({ required_error: 'Enter your password.' })
      .min(1, 'Enter your password.')
      .max(72, 'Incorrect email/mobile number or password.')
  })
  .transform((data, ctx) => {
    const id = data.identifier.toLowerCase();
    if (id.includes('@')) {
      const email = emailSchema.safeParse(id);
      if (email.success) return { email: email.data, password: data.password };
    } else if (PHONE_REGEX.test(id)) {
      return { phone: id, password: data.password };
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['identifier'],
      message: 'Enter a valid email or 10-digit mobile number.'
    });
    return z.NEVER;
  });

export type LoginInput = z.infer<typeof loginSchema>;
