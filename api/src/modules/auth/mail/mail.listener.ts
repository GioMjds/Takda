import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service.interface';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  InviteCreatedEvent,
  PasswordResetRequestedEvent,
} from './events';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailListener {
  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent(EVENTS.INVITE_CREATED, { async: true })
  async handleInviteCreated(payload: InviteCreatedEvent) {
    const scheme = this.config.get<string>('MOBILE_APP_SCHEME');
    const link = `${scheme}invites/accept?token=${payload.rawToken}`;
    await this.mail.sendInviteEmail(payload.email, link);
  }

  @OnEvent(EVENTS.PASSWORD_RESET_REQUESTED, { async: true })
  async handlePasswordResetRequested(payload: PasswordResetRequestedEvent) {
    const scheme = this.config.get<string>('MOBILE_APP_SCHEME');
    const link = `${scheme}auth/reset-password?token=${payload.rawToken}`;
    await this.mail.sendPasswordResetEmail(payload.email, link);
  }
}
