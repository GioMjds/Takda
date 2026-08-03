import { z } from 'zod';

export const CreateInviteSchema = z.object({
  email: z.string().email().max(254),
});

export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;
