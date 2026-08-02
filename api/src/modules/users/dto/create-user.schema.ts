import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().min(1, "Last name is required").max(200),
  role: z.enum(['Customer', 'BusinessOwner', 'Staff']).default('Customer'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
