import { z } from 'zod';

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
});

export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
