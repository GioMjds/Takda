import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { TenantRequiredException } from '../exceptions';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get user(): CurrentUserPayload {
    return (this.request as any).user;
  }

  get userId(): string {
    return this.user?.id;
  }

  get tenantId(): string {
    const tid = this.user?.tenantId;
    if (!tid) {
      throw new TenantRequiredException();
    }
    return tid;
  }

  get role(): UserRole {
    return this.user?.role;
  }
}
