import { z } from "zod";
import { createEndpoint } from "@/configs";
import { UserPublicSchema, type UserPublic } from "./auth";

// --- Users Schemas ---

export const CreateableRoleSchema = z.enum(["Staff", "Customer"]);

export const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128),
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().min(1, "Last name is required").max(200),
  role: CreateableRoleSchema.default("Customer"),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(200).optional(),
  lastName: z.string().min(1, "Last name is required").max(200).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export interface FindUsersQuery {
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
  includeArchived?: boolean;
}

// --- Users Endpoint Service ---

const usersEndpoint = createEndpoint("/users");

export const usersService = {
  findAll: (query?: FindUsersQuery) =>
    usersEndpoint.get<UserPublic[]>("/", {
      response: z.array(UserPublicSchema),
      config: {
        auth: true,
        params: query as Record<string, string | number | boolean>,
      },
    }),

  findById: (id: string) =>
    usersEndpoint.get<UserPublic>(`/${id}`, {
      response: UserPublicSchema,
      config: { auth: true },
    }),

  create: (dto: CreateUserDto) =>
    usersEndpoint.post<CreateUserDto, UserPublic>("/", {
      body: dto,
      response: UserPublicSchema,
      config: { auth: true },
    }),

  update: (id: string, dto: UpdateUserDto) =>
    usersEndpoint.patch<UpdateUserDto, UserPublic>(`/${id}`, {
      body: dto,
      response: UserPublicSchema,
      config: { auth: true },
    }),

  remove: (id: string) =>
    usersEndpoint.delete<void>(`/${id}`, {
      response: z.undefined(),
      config: { auth: true },
    }),

  archive: (id: string) =>
    usersEndpoint.patch<Record<string, never>, UserPublic>(`/${id}/archive`, {
      body: {},
      response: UserPublicSchema,
      config: { auth: true },
    }),

  restore: (id: string) =>
    usersEndpoint.patch<Record<string, never>, UserPublic>(`/${id}/restore`, {
      body: {},
      response: UserPublicSchema,
      config: { auth: true },
    }),
};
