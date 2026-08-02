import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  role: z.enum(['Customer', 'BusinessOwner', 'Staff']).default('Customer'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
