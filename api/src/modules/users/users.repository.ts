import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Customer' | 'BusinessOwner' | 'Staff';
  createdAt: Date;
}

export function toUserPublic(row: User): UserPublic {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}