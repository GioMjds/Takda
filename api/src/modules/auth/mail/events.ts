export const EVENTS = {
  INVITE_CREATED: 'invite.created',
  PASSWORD_RESET_REQUESTED: 'password.reset.requested',
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