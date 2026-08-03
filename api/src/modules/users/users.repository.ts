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
  tenantId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends UserPublic {
  password: string;
}

export type CreateBusinessOwnerInput = Pick<
  UserPublic,
  'email' | 'firstName' | 'lastName'
> & {
  password: string;
  tenantName: string;
};

export type CreateStaffFromInviteInput = Pick<
  UserPublic,
  'email' | 'firstName' | 'lastName' | 'tenantId'
> & {
  password: string;
  inviteId: string;
};

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
    tenantId: row.tenantId,
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

  async findByEmailWithPassword(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserWithPassword | null> {
    const finalWhere: Prisma.UserWhereInput = { email };
    if (!options?.includeDeleted) {
      finalWhere.deletedAt = null;
    }

    const row = await this.prisma.user.findFirst({
      where: finalWhere,
    });

    return row
      ? {
          id: row.id,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          password: row.password,
          role: row.role,
          tenantId: row.tenantId,
          isActive: row.isActive,
          deletedAt: row.deletedAt,
          archivedAt: row.archivedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : null;
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

  async createBusinessOwner(
    data: CreateBusinessOwnerInput,
  ): Promise<UserPublic> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: data.tenantName },
      });
      const user = await tx.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          role: UserRole.BusinessOwner,
          tenantId: tenant.id,
        },
      });
      return toUserPublic(user);
    });
  }

  async createStaffFromInvite(
    data: CreateStaffFromInviteInput,
  ): Promise<UserPublic> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          role: UserRole.Staff,
          tenantId: data.tenantId,
        },
      });
      await tx.invite.update({
        where: { id: data.inviteId },
        data: { 
          acceptedAt: new Date(), 
          acceptedById: user.id 
        },
      });
      return toUserPublic(user);
    });
  }

  private async findOne(
    where: Prisma.UserWhereInput,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
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
