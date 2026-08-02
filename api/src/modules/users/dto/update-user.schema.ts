import { z } from 'zod';
import { CreateUserSchema } from './create-user.schema';

export const updateUserSchema = CreateUserSchema.partial();

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
