import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CustomLoggerService } from '@/common/services';

export interface AuditAction {
  action: string;
  entity: string;
  entityId: string | bigint;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {}

  async logAction(input: AuditAction) {
    const entityId =
      typeof input.entityId === 'string'
        ? input.entityId
        : String(input.entityId);

    try {
      return await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId,
          actorUserId: input.actorUserId ?? null,
          payload: input.payload
            ? (input.payload as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (e) {
      this.logger.error(
        `Audit log failed: ${input.action} ${input.entity}:${entityId}`,
        e instanceof Error ? e.stack : String(e),
        'AuditService',
      );
      throw e;
    }
  }
}
