import { z } from "zod";
import { createEndpoint } from "@/configs/fetch";

export const UserRoleSchema = z.enum([
  "BusinessOwner",
  "Staff",
  "Customer",
  "SuperAdmin",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserPublicSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: UserRoleSchema,
  tenantId: z.string().nullable(),
  isActive: z.boolean(),
  deletedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  avatarUrl: z.string().nullable().optional(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

// --- Auth Schemas ---

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserPublicSchema,
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const LoginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1, "Password is required"),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RegisterBusinessOwnerSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  tenantName: z.string().min(1).max(200),
});
export type RegisterBusinessOwnerDto = z.infer<
  typeof RegisterBusinessOwnerSchema
>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email().max(254),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const VerifyOtpSchema = z.object({
  email: z.email().max(255),
  code: z.string().length(6),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const ResendOtpSchema = z.object({
  email: z.email().max(255),
});
export type ResendOtpDto = z.infer<typeof ResendOtpSchema>;


// --- Auth Endpoint Service ---

const authEndpoint = createEndpoint("/auth");

export const authService = {
  login: (dto: LoginDto) =>
    authEndpoint.post<LoginDto, AuthTokens>("/login", {
      body: dto,
      response: AuthTokensSchema,
    }),

  register: (dto: RegisterBusinessOwnerDto) =>
    authEndpoint.post<RegisterBusinessOwnerDto, AuthTokens>("/register", {
      body: dto,
      response: AuthTokensSchema,
    }),

  refresh: (dto: RefreshTokenDto) =>
    authEndpoint.post<RefreshTokenDto, AuthTokens>("/refresh", {
      body: dto,
      response: AuthTokensSchema,
    }),

  forgotPassword: (dto: ForgotPasswordDto) =>
    authEndpoint.post<ForgotPasswordDto, void>("/forgot-password", {
      body: dto,
      response: z.undefined(),
    }),

  resetPassword: (dto: ResetPasswordDto) =>
    authEndpoint.post<ResetPasswordDto, AuthTokens>("/reset-password", {
      body: dto,
      response: AuthTokensSchema,
    }),

  verifyOtp: (dto: VerifyOtpDto) =>
    authEndpoint.post<VerifyOtpDto, AuthTokens>('/otp/verify', {
      body: dto,
      response: AuthTokensSchema,
    }),

  requestOtp: (dto: ResendOtpDto) =>
    authEndpoint.post<ResendOtpDto, void>('/otp/request', {
      body: dto,
      response: z.undefined(),
    }),


  logout: (dto: RefreshTokenDto) =>
    authEndpoint.post<RefreshTokenDto, void>("/logout", {
      body: dto,
      response: z.undefined(),
      config: { auth: true },
    }),

  logoutAll: () =>
    authEndpoint.post<Record<string, never>, void>("/logout-all", {
      body: {},
      response: z.undefined(),
      config: { auth: true },
    }),

  me: () =>
    authEndpoint.get<UserPublic>("/me", {
      response: UserPublicSchema,
      config: { auth: true },
    }),
};

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  return authService.refresh({ refreshToken });
}
