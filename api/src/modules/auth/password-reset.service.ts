import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AuditService, UsersService } from '../users';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService, AuthTokens } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { EVENTS } from './mail';
import { ResetPasswordDto } from './dto';
import { ResetTokenInvalidException } from '@/common/exceptions';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly event: EventEmitter2,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const ttlSeconds = this.config.get<number>(
      'PASSWORD_RESET_TTL_SECONDS',
    ) as number;

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    await this.audit.logAction({
      actorUserId: null,
      entity: 'User',
      entityId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      payload: { email },
    });

    this.event.emit(EVENTS.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email,
      rawToken,
    });
  }

  async resetPassword(
    dto: ResetPasswordDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const now = new Date();
    const activeTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: now },
      },
    });

    let matchedToken: (typeof activeTokens)[0] | null = null;
    for (const t of activeTokens) {
      const match = await bcrypt.compare(dto.token, t.tokenHash);
      if (match) {
        matchedToken = t;
        break;
      }

      if (!matchedToken) throw new ResetTokenInvalidException();

      const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

      await this.prisma.user.update({
        where: { id: matchedToken.userId },
        data: { password: newPasswordHash },
      });

      await this.prisma.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: new Date() },
      });

      await this.prisma.refreshToken.updateMany({
        where: { userId: matchedToken.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await this.audit.logAction({
        actorUserId: matchedToken.userId,
        entity: 'User',
        entityId: matchedToken.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        payload: { userId: matchedToken.userId },
      });

      const user = await this.users.findById(matchedToken.userId);
      if (!user || !user.isActive || !user.tenantId) {
        throw new ResetTokenInvalidException();
      }

      return this.auth.issueTokensFor(user, userAgent, ip);
    }
  }
}
