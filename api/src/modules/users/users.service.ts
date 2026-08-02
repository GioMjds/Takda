import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import type { UserPublic, UsersFindAll } from './users.repository';
import { AuditService } from './audit.service';
import { ConflictException } from '@/common/exceptions';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    return this.repo.findById(id, options);
  }

  findByEmail(email: string): Promise<UserPublic | null> {
    return this.repo.findByEmail(email);
  }

  findAll(params?: UsersFindAll): Promise<UserPublic[]> {
    return this.repo.findAll(params);
  }

  async createUser(dto: CreateUserDto): Promise<UserPublic> {
    const existing = await this.repo.findByEmail(dto.email, {
      includeDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: hashedPassword,
      role: dto.role,
    });

    await this.audit.logAction('USER_CREATED', user.id);
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    const updated = await this.repo.update(id, dto);
    await this.audit.logAction('USER_UPDATED', id);
    return updated;
  }

  async softDeleteUser(id: string): Promise<UserPublic> {
    const deleted = await this.repo.softDelete(id);
    await this.audit.logAction('USER_DELETED', id);
    return deleted;
  }

  async archiveUser(id: string): Promise<UserPublic> {
    const archived = await this.repo.archive(id);
    await this.audit.logAction('USER_ARCHIVED', id);
    return archived;
  }

  async restoreUser(id: string): Promise<UserPublic> {
    const restored = await this.repo.restore(id);
    await this.audit.logAction('USER_RESTORED', id);
    return restored;
  }
}
