import { z } from 'zod';

export const RegisterBusinessOwnerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  tenantName: z.string().min(1).max(200),
});

export type RegisterBusinessOwnerDto = z.infer<
  typeof RegisterBusinessOwnerSchema
>;
