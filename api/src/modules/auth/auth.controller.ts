import {
  Controller,
  Body,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegistrationService } from './registration.service';
import { CurrentUser, Public } from '@/common/decorators';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterBusinessOwnerDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { RateLimitGuard, RateLimit } from './rate-limit';
import { CurrentUserPayload } from '@/common/services';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly registration: RegistrationService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 900000, max: 5 })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('register')
  @RateLimit({ windowMs: 900000, max: 5 })
  @HttpCode(HttpStatus.OK)
  register(@Body() dto: RegisterBusinessOwnerDto, @Req() req: Request) {
    return this.registration.registerBusinessOwner(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ windowMs: 900000, max: 3 })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordReset.requestReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 900000, max: 3 })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.passwordReset.resetPassword(
      dto,
      req.headers?.['user-agent'],
      req.ip,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RefreshTokenDto,
  ) {
    await this.auth.logout(user.id, dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: CurrentUserPayload) {
    await this.auth.logoutAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.me(user.id);
  }
}
