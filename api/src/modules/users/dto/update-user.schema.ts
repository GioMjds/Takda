import { z } from 'zod';

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(200).optional(),
  lastName: z.string().min(1, "Last name is required").max(200).optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
