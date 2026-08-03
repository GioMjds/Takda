import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository';
import type {
  CreateBusinessOwnerInput,
  CreateStaffFromInviteInput,
  UserPublic,
  UsersFindAll,
  UserWithPassword,
} from './users.repository';
import { AuditService } from './audit.service';
import {
  ConflictException,
  InvalidStateException,
  UserNotFoundException,
} from '@/common/exceptions';
import type { CreateUserDto, UpdateUserDto } from './dto';
import type { CurrentUserPayload } from '@/common/decorators';
import { UserRole } from '@prisma/client';

const ENTITY = 'User';

@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.bcryptRounds = config.get<number>('BCRYPT_ROUNDS', 10);
  }

  findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    return this.repo.findById(id, options);
  }

  findByEmail(email: string): Promise<UserPublic | null> {
    return this.repo.findByEmail(email);
  }

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.repo.findByEmailWithPassword(email);
  }

  findAll(params?: UsersFindAll): Promise<UserPublic[]> {
    return this.repo.findAll(params);
  }

  async createUser(
    dto: CreateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserPublic> {
    if ((dto.role as UserRole) === UserRole.BusinessOwner) {
      throw new ConflictException(
        'Cannot create a BusinessOwner account via this endpoint',
      );
    }

    const existing = await this.repo.findByEmail(dto.email, {
      includeDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);
    const user = await this.repo.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: hashedPassword,
      role: dto.role,
    });

    await this.audit.logAction({
      action: 'USER_CREATED',
      entity: ENTITY,
      entityId: user.id,
      actorUserId: actor.userId,
      payload: { email: user.email, role: user.role },
    });
    return user;
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserPublic> {
    const before = await this.repo.findById(id);
    if (!before) throw new UserNotFoundException(id);

    const data = { ...dto } satisfies Record<string, unknown>;
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, this.bcryptRounds);
    }

    const updated = await this.repo.update(id, data);

    await this.audit.logAction({
      action: 'USER_UPDATED',
      entity: ENTITY,
      entityId: id,
      actorUserId: actor.userId,
      payload: {
        before: {
          firstName: before.firstName,
          lastName: before.lastName,
          isActive: before.isActive,
        },
        after: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          isActive: updated.isActive,
        },
      },
    });
    return updated;
  }

  async softDeleteUser(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<UserPublic> {
    const user = await this.repo.findById(id, { includeDeleted: true });
    if (!user) throw new UserNotFoundException(id);
    if (user.deletedAt) {
      throw new InvalidStateException(`User ${id} is already deleted`);
    }

    const deleted = await this.repo.softDelete(id);
    await this.audit.logAction({
      action: 'USER_DELETED',
      entity: ENTITY,
      entityId: id,
      actorUserId: actor.userId,
    });
    return deleted;
  }

  async archiveUser(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<UserPublic> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundException(id);
    if (user.archivedAt) {
      throw new InvalidStateException(`User ${id} is already archived`);
    }

    const archived = await this.repo.archive(id);
    await this.audit.logAction({
      action: 'USER_ARCHIVED',
      entity: ENTITY,
      entityId: id,
      actorUserId: actor.userId,
    });
    return archived;
  }

  async restoreUser(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<UserPublic> {
    const user = await this.repo.findById(id, { includeDeleted: true });
    if (!user) throw new UserNotFoundException(id);
    if (!user.deletedAt && !user.archivedAt) {
      throw new InvalidStateException(
        `User ${id} is not deleted or archived; nothing to restore`,
      );
    }

    const restored = await this.repo.restore(id);
    await this.audit.logAction({
      action: 'USER_RESTORED',
      entity: ENTITY,
      entityId: id,
      actorUserId: actor.userId,
    });
    return restored;
  }

  async findMe(actor: CurrentUserPayload): Promise<UserPublic> {
    const me = await this.repo.findById(actor.userId);
    if (!me) throw new UserNotFoundException(actor.userId);
    return me;
  }

  async updateMe(
    actor: CurrentUserPayload,
    dto: UpdateUserDto,
  ): Promise<UserPublic> {
    return this.updateUser(actor.userId, dto, actor);
  }

  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<UserPublic> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UserNotFoundException(userId);
    const updated = await this.repo.update(userId, { avatarUrl });
    await this.audit.logAction({
      action: 'USER_AVATAR_UPDATED',
      entity: ENTITY,
      entityId: userId,
      actorUserId: userId,
    });
    return updated;
  }

  async createBusinessOwner(
    data: CreateBusinessOwnerInput,
  ): Promise<UserPublic> {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.repo.createBusinessOwner(data);
  }

  async createStaffFromInvite(
    data: CreateStaffFromInviteInput,
  ): Promise<UserPublic> {
    return this.repo.createStaffFromInvite(data);
  }
}
