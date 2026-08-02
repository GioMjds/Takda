import { z } from 'zod';

const CreateableRole = z.enum(['Staff', 'Customer']);

export const CreateUserSchema = z.object({
  email: z.email().max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128),
  firstName: z.string().min(1, 'First name is required').max(200),
  lastName: z.string().min(1, 'Last name is required').max(200),
  role: CreateableRole.default('Customer'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;