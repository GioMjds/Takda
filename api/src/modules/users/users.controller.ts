import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    const user = await this.service.findById(id);
    return user;
  }
}
