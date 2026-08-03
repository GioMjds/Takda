import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { InvitesService } from './invites.service';
import { CreateInviteDto, AcceptInviteDto } from './dto';
import {
  Public,
  CurrentUser,
  Roles,
  CurrentUserPayload,
} from '@/common/decorators';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { RateLimit, RateLimitGuard } from './rate-limit';
import { UserRole } from '@prisma/client';

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @Roles(UserRole.BusinessOwner)
  @RateLimit({ windowMs: 900000, max: 10 })
  async createInvite(
    @CurrentUser() actor: CurrentUserPayload,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.createInvite(actor, dto);
  }

  @Public()
  @Post('accept')
  @RateLimit({ windowMs: 900000, max: 10 })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.invitesService.acceptInvite(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
  }
}
