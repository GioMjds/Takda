import { ForbiddenException } from '@nestjs/common';

export class TenantRequiredException extends ForbiddenException {
  constructor() {
    super('User must belong to a tenant');
  }
}
