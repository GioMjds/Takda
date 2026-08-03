import {
  Controller,
  Body,
  Get,
  Post,
  Request,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { CurrentUser, CurrentUserPayload, Public } from '@/common/decorators';
import { ZodValidationPipe } from '@/common/pipes';
import {
  ForgotPasswordDto,
  ForgotPasswordSchema,
  LoginDto,
  LoginSchema,
  RegisterDto,
  RegisterSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
} from './dto';
import { JwtAuthGuard } from '@/common/guards';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req: any) {
    return this.passwordReset.requestReset(
      dto.email,
      req.headers?.['user-agent'],
      req.ip,
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto, @Request() req: any) {
    return this.passwordReset.resetPassword(
      dto,
      req.headers?.['user-agent'],
      req.ip,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }
}
