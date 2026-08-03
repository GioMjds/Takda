export abstract class MailService {
  abstract sendInviteEmail(to: string, inviteLink: string): Promise<void>;
  abstract sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
  abstract sendOtpEmail(to: string, code: string): Promise<void>;
}
