import { Injectable } from '@nestjs/common';
import { AuditService, UsersService } from '../users';
import { AuthService, AuthTokens } from './auth.service';
import { RegisterBusinessOwnerDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async registerBusinessOwner(
    dto: RegisterBusinessOwnerDto,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.users.createBusinessOwner({
      email: dto.email,
      password: passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      tenantName: dto.tenantName,
    });

    await this.audit.logAction({
      actorUserId: null,
      entity: 'User',
      entityId: user.id,
      action: 'BUSINESS_OWNER_REGISTERED',
      payload: {
        email: user.email,
        tenantId: user.tenantId,
        tenantName: dto.tenantName,
      },
    });

    return this.auth.issueTokensFor(user, userAgent, ip);
  }
}
