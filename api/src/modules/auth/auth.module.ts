import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { UsersModule } from '../users';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetService],
  exports: [AuthService],
})
export class AuthModule {}
