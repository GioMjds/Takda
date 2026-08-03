import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service.interface';
import { CustomLoggerService } from '@/common/services';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NodemailerMailService implements MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: CustomLoggerService,
    private readonly config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendInviteEmail(to: string, inviteLink: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM');
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Business Invitation',
        html: `<p>Click here to accept your invitation: <a href="${inviteLink}">${inviteLink}</a></p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invite email to ${to}`,
        error instanceof Error ? error.stack : String(error),
        'NodemailerMailService',
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM');
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Password Reset Request',
        html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        error instanceof Error ? error.stack : String(error),
        'NodemailerMailService',
      );
    }
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM');
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Your Takda verification code',
        html: `<p>Your verification code is: <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send OTP email to ${to}`,
        error instanceof Error ? error.stack : String(error),
        'NodemailerMailService',
      );
    }
  }
}
