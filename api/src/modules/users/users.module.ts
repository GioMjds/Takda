import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditService } from './audit.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditService, UsersRepository],
  exports: [UsersService, AuditService],
})
export class UsersModule {}
