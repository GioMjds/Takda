import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserNotFoundException } from '@/common/exceptions';
import { parseBool, parseQueryInt } from '@/common/utils';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.BusinessOwner, UserRole.Staff)
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.users.findAll({
      skip: parseQueryInt(skip),
      take: parseQueryInt(take),
      includeDeleted: parseBool(includeDeleted),
      includeArchived: parseBool(includeArchived),
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  @Post()
  @Roles(UserRole.BusinessOwner)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.BusinessOwner)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.users.softDeleteUser(id);
  }

  @Patch(':id/archive')
  @Roles(UserRole.BusinessOwner)
  async archive(@Param('id') id: string) {
    return this.users.archiveUser(id);
  }

  @Patch(':id/restore')
  @Roles(UserRole.BusinessOwner)
  async restore(@Param('id') id: string) {
    return this.users.restoreUser(id);
  }
}
