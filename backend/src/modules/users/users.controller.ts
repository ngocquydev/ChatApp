// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Tạo người dùng trực tiếp & liệt kê toàn bộ người dùng: chỉ admin (đăng ký công khai dùng /auth/register)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('schools')
  getSchools(@Query('q') query?: string, @Query('limit') limit?: number) {
    return this.usersService.getSchools(query, limit);
  }

  @Get('search')
  search(@Query('q') query?: string) {
    return this.usersService.searchUsers(query);
  }
}
