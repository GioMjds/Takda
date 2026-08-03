export const EVENTS = {
  INVITE_CREATED: 'invite.created',
  PASSWORD_RESET_REQUESTED: 'password.reset.requested',
  OTP_REQUESTED: 'otp.requested',
} as const;

export interface InviteCreatedEvent {
  inviteId: string;
  email: string;
  rawToken: string;
}

export interface PasswordResetRequestedEvent {
  userId: string;
  email: string;
  rawToken: string;
}

export interface OtpRequestedEvent {
  userId: string;
  email: string;
  code: string; // raw 6-digit code for display in email
}