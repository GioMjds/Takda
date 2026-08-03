import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma';
import { AuditService, UsersService } from '../users';
import { AuthService, AuthTokens } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CurrentUserPayload } from '@/common/decorators';
import { AcceptInviteDto, CreateInviteDto } from './dto';
import { UserRole } from '@prisma/client';
import {
  ForbiddenException,
  InviteExpiredException,
  InviteNotFoundException,
} from '@/common/exceptions';
import { randomBytes } from 'crypto';
import { EVENTS } from './mail';

export interface InvitePublic {
  id: string;
  email: string;
  expiresAt: Date;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly event: EventEmitter2,
  ) {}

  async createInvite(
    actor: CurrentUserPayload,
    dto: CreateInviteDto,
  ): Promise<InvitePublic> {
    if (actor.role !== UserRole.BusinessOwner) {
      throw new ForbiddenException(
        'Only business owners can create staff invites.',
      );
    }

    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant required to create invites');
    }

    const now = new Date();

    const existing = await this.prisma.invite.findFirst({
      where: {
        tenantId: actor.tenantId,
        email: dto.email,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        expiresAt: existing.expiresAt,
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const ttlSeconds = this.config.get<number>('INVITE_TTL_SECONDS') || 604800;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const invite = await this.prisma.invite.create({
      data: {
        tenantId: actor.tenantId,
        email: dto.email,
        role: UserRole.Staff,
        tokenHash,
        expiresAt,
        createdById: actor.userId,
      },
    });

    await this.audit.logAction({
      actorUserId: actor.userId,
      entity: 'Invite',
      entityId: invite.id,
      action: 'INVITE_CREATED',
      payload: { inviteId: invite.id, email: dto.email },
    });

    this.event.emit(EVENTS.INVITE_CREATED, {
      inviteId: invite.id,
      email: dto.email,
      rawToken,
    });

    return {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInvite(
    dto: AcceptInviteDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const activeInvites = await this.prisma.invite.findMany({
      where: { acceptedAt: null },
    });

    let matchedInvite: (typeof activeInvites)[0] | null = null;
    for (const inv of activeInvites) {
      const match = await bcrypt.compare(dto.token, inv.tokenHash);
      if (match) {
        matchedInvite = inv;
        break;
      }
    }

    if (!matchedInvite) {
      throw new InviteNotFoundException();
    }

    if (matchedInvite.expiresAt.getTime() < Date.now()) {
      throw new InviteExpiredException();
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.users.createStaffFromInvite({
      email: matchedInvite.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: passwordHash,
      tenantId: matchedInvite.tenantId,
      inviteId: matchedInvite.id,
    });

    await this.audit.logAction({
      actorUserId: newUser.id,
      entity: 'Invite',
      entityId: matchedInvite.id,
      action: 'INVITE_ACCEPTED',
      payload: { inviteId: matchedInvite.id, tenantId: matchedInvite.tenantId },
    });

    return this.auth.issueTokensFor(newUser, userAgent, ip);
  }
}
