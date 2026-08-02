import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User, UserRole } from '@prisma/client';
import { UserNotFoundException } from '@/common/exceptions';

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  deletedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UsersFindAll = {
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
  includeArchived?: boolean;
};

export type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
};

export function toUserPublic(row: User): UserPublic {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    isActive: row.isActive,
    deletedAt: row.deletedAt,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    return this.findOne({ id }, options);
  }

  async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    return this.findOne({ email }, options);
  }

  async findAll(params?: UsersFindAll): Promise<UserPublic[]> {
    const where = this.buildWhere(params);
    const users = await this.prisma.user.findMany({
      where,
      skip: params?.skip ?? 0,
      take: params?.take ?? 50,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toUserPublic);
  }

  async create(data: CreateUserInput): Promise<UserPublic> {
    const user = await this.prisma.user.create({ data });
    return toUserPublic(user);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserPublic> {
    return this.runUpdate(id, () =>
      this.prisma.user.update({ where: { id }, data }),
    );
  }

  async softDelete(id: string): Promise<UserPublic> {
    return this.runUpdate(id, () =>
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );
  }

  async archive(id: string): Promise<UserPublic> {
    return this.runUpdate(id, () =>
      this.prisma.user.update({
        where: { id },
        data: { archivedAt: new Date(), isActive: false },
      }),
    );
  }

  async restore(id: string): Promise<UserPublic> {
    return this.runUpdate(id, () =>
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: null, archivedAt: null, isActive: true },
      }),
    );
  }

  private async findOne(
    where: Prisma.UserWhereInput,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    // Build a new where object — do not mutate the caller's argument.
    const finalWhere: Prisma.UserWhereInput = { ...where };
    if (!options?.includeDeleted) {
      finalWhere.deletedAt = null;
    }
    const user = await this.prisma.user.findFirst({ where: finalWhere });
    return user ? toUserPublic(user) : null;
  }

  private async runUpdate(
    id: string,
    fn: () => Promise<User>,
  ): Promise<UserPublic> {
    try {
      const user = await fn();
      return toUserPublic(user);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new UserNotFoundException(id);
      }
      throw e;
    }
  }

  private buildWhere(params?: UsersFindAll): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    if (!params?.includeDeleted) where.deletedAt = null;
    if (!params?.includeArchived) where.archivedAt = null;
    return where;
  }
}
