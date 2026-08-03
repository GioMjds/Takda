import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@/common/exceptions';
import * as bcrypt from 'bcrypt';
import { AuditService, type UserPublic, UsersService } from '../users';
import { LoginDto, RefreshTokenDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(
    dto: LoginDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const userWithPassword = await this.users.findByEmailWithPassword(
      dto.email,
    );

    if (!userWithPassword || !userWithPassword.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive user');
    }

    if (!userWithPassword.tenantId) {
      throw new UnauthorizedException('Customers cannot log in via this flow.');
    }

    const matches = await bcrypt.compare(
      dto.password,
      userWithPassword.password,
    );
    if (!matches) throw new UnauthorizedException('Invalid credentials');

    const { ...userPublic } = userWithPassword;
    return this.issueTokensFor(userPublic, userAgent, ip);
  }

  async refresh(
    dto: RefreshTokenDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const tokenRow = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (
      !tokenRow ||
      tokenRow.revokedAt ||
      tokenRow.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { revokedAt: new Date() },
    });

    const user = await this.users.findById(tokenRow.userId);
    if (!user || !user.isActive || !user.tenantId) {
      throw new UnauthorizedException('User inactive or invalid');
    }

    return this.issueTokensFor(user, userAgent, ip);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken);
      if (payload.jti && payload.sub === userId) {
        await this.prisma.refreshToken.update({
          where: { id: payload.jti },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Intentionally ignore invalid tokens on logout
    }
  }

  async logoutAll(userId: string): Promise<void> {
    const res = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.logAction({
      actorUserId: userId,
      entity: 'User',
      entityId: userId,
      action: 'LOGOUT_ALL',
      payload: { revokedCount: res.count },
    });
  }

  async me(userId: string): Promise<UserPublic> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async issueTokensFor(
    user: UserPublic,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const accessTtl = this.config.get<number>(
      'JWT_ACCESS_TTL_SECONDS',
    ) as number;
    const refreshTtl = this.config.get<number>(
      'JWT_REFRESH_TTL_SECONDS',
    ) as number;

    const accessJti = uuidv4();
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        type: 'access',
        jti: accessJti,
      },
      { expiresIn: accessTtl },
    );

    const refreshTokenRow = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: uuidv4(),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent,
        ip,
      },
    });

    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        type: 'refresh',
        jti: refreshTokenRow.id,
      },
      {
        expiresIn: refreshTtl,
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRow.id },
      data: { tokenHash },
    });

    return { accessToken, refreshToken, user };
  }
}
