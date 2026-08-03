import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { EmailOtp } from '@prisma/client';
import { AuditService, UsersService } from '../users';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService, AuthTokens } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { EVENTS } from './mail';
import { VerifyOtpDto } from './dto';
import { ResetTokenInvalidException } from '@/common/exceptions';

const DEFAULT_OTP_TTL_SECONDS = 600; // 10 minutes
const DEFAULT_BCRYPT_ROUNDS = 10;

@Injectable()
export class OtpService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly event: EventEmitter2,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    this.bcryptRounds =
      config.get<number>('BCRYPT_ROUNDS') ?? DEFAULT_BCRYPT_ROUNDS;
  }

  async requestOtp(
    email: string,
    userAgent?: string,
    ip?: string,
  ): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return;

    const rawCode = randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(rawCode, this.bcryptRounds);
    const ttlSeconds =
      this.config.get<number>('OTP_TTL_SECONDS') ?? DEFAULT_OTP_TTL_SECONDS;

    await this.prisma.emailOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    await this.audit.logAction({
      actorUserId: null,
      entity: 'User',
      entityId: user.id,
      action: 'OTP_REQUESTED',
      payload: { email, userAgent, ip },
    });

    this.event.emit(EVENTS.OTP_REQUESTED, {
      userId: user.id,
      email,
      code: rawCode,
    });
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const now = new Date();

    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new ResetTokenInvalidException();
    }

    const activeTokens = await this.prisma.emailOtp.findMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let matchedToken: EmailOtp | null = null;
    for (const t of activeTokens) {
      const match = await bcrypt.compare(dto.code, t.codeHash);
      if (match) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new ResetTokenInvalidException();
    }

    await this.prisma.emailOtp.update({
      where: { id: matchedToken.id },
      data: { usedAt: now },
    });

    await this.audit.logAction({
      actorUserId: matchedToken.userId,
      entity: 'User',
      entityId: matchedToken.userId,
      action: 'OTP_VERIFIED',
      payload: { userId: matchedToken.userId, userAgent, ip },
    });

    return this.auth.issueTokensFor(user, userAgent, ip);
  }
}
