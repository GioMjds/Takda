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
import { CurrentUser, CurrentUserPayload, Public } from '@/common/decorators';
import { ZodValidationPipe } from '@/common/pipes';
import { LoginDto, LoginSchema, RegisterDto, RegisterSchema } from './dto';
import { JwtAuthGuard } from '@/common/guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }
}
