import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  role: z.enum(['Staff', 'Customer']).default('Customer'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
