import { z } from "zod";
import { createEndpoint, ApiError } from "@/configs/fetch";
import { UserPublicSchema, type UserPublic } from "./auth";
import { useAuthStore } from "@/stores/auth";

// --- Users Schemas ---

export const CreateableRoleSchema = z.enum(["Staff", "Customer"]);

export const CreateUserSchema = z.object({
  email: z.email().max(254),
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

export const UpdateMeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(200).optional(),
  lastName: z.string().min(1, "Last name is required").max(200).optional(),
});
export type UpdateMeDto = z.infer<typeof UpdateMeSchema>;

export interface FindUsersQuery {
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
  includeArchived?: boolean;
}

// --- Users Endpoint Service ---

const usersEndpoint = createEndpoint("/users");

export const usersService = {
  updateMe: (dto: UpdateMeDto) =>
    usersEndpoint.patch<UpdateMeDto, UserPublic>("me", {
      body: dto,
      response: UserPublicSchema,
      config: { auth: true },
    }),

  uploadAvatar: async (uri: string): Promise<UserPublic> => {
    const { accessToken } = useAuthStore.getState();
    const formData = new FormData();
    // React Native's FormData accepts { uri, name, type }
    formData.append('avatar', {
      uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me/avatar`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new ApiError(
        (payload as { message?: string }).message ?? 'Avatar upload failed',
        response.status,
      );
    }

    const data = await response.json();
    const parsed = UserPublicSchema.safeParse(data);
    if (!parsed.success) throw new ApiError('Invalid server response', 500);
    return parsed.data;
  },

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
