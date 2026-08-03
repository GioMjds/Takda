import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { UsersModule } from '../users';
import { MailModule } from './mail/mail.module';
import { RateLimitModule } from './rate-limit';
import { InvitesController } from './invites.controller';
import { RegistrationService } from './registration.service';
import { InvitesService } from './invites.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [UsersModule, MailModule, RateLimitModule],
  controllers: [AuthController, InvitesController],
  providers: [
    AuthService,
    PasswordResetService,
    RegistrationService,
    InvitesService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
