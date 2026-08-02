import { z } from 'zod';

export const FindUsersQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).max(10_000).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
  includeDeleted: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  includeArchived: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
});

export type FindUsersQueryDto = z.infer<typeof FindUsersQuerySchema>;
