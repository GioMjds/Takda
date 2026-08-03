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
  UsePipes,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  CreateUserSchema,
  UpdateUserDto,
  UpdateUserSchema,
  FindUsersQuerySchema,
} from './dto';
import { UserNotFoundException } from '@/common/exceptions';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserPayload, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@/common/pipes';
import { CustomLoggerService } from '@/common/services';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly logger: CustomLoggerService,
  ) {}

  @Get('me')
  async findMe(@CurrentUser() actor: CurrentUserPayload) {
    return this.users.findMe(actor);
  }

  @Patch('me')
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async updateMe(
    @CurrentUser() actor: CurrentUserPayload,
    @Body() dto: UpdateUserDto
  ) {
    return this.users.updateMe(actor, dto);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      cb(null, allowed.includes(file.mimetype));
    },
  }))
  async uploadAvatar(
    @CurrentUser() actor: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No valid image file provided');
    const url = `/uploads/avatars/${file.filename}`;
    return this.users.updateAvatarUrl(actor.userId, url);
  }

  @Get()
  @Roles(UserRole.BusinessOwner, UserRole.Staff)
  async findAll(
    @Query(new ZodValidationPipe(FindUsersQuerySchema))
    query: {
      skip?: number;
      take?: number;
      includeDeleted?: boolean;
      includeArchived?: boolean;
    },
  ) {
    return this.users.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.users.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found`, 'UsersController');
      throw new UserNotFoundException(id);
    }
    return user;
  }

  @Post()
  @Roles(UserRole.BusinessOwner)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.users.createUser(dto, actor);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.users.updateUser(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.BusinessOwner)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.users.softDeleteUser(id, actor);
  }

  @Patch(':id/archive')
  @Roles(UserRole.BusinessOwner)
  async archive(
    @Param('id') id: string,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.users.archiveUser(id, actor);
  }

  @Patch(':id/restore')
  @Roles(UserRole.BusinessOwner)
  async restore(
    @Param('id') id: string,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.users.restoreUser(id, actor);
  }
}
