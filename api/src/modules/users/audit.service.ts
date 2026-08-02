import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    action?: string,
    entityId?: bigint | string,
    actorUserId?: string,
    payload?: Record<string, unknown>,
  ) {
    let parsedEntityId: bigint | undefined;
    if (entityId !== undefined) {
      parsedEntityId =
        typeof entityId === 'string' ? BigInt(entityId) : entityId;
    }

    return this.prisma.auditLog.create({
      data: {
        action: action ?? 'UNKNOWN',
        entity: 'User',
        entityId: parsedEntityId,
        actorUserId: actorUserId ?? null,
        payload: payload ? (payload as any) : undefined,
      },
    });
  }
}
