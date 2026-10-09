// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from '../users/users.service.js';
import type { Response as ExpressResponse } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản mới và trả về cặp Access/Refresh Token',
  })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const newUser = await this.userService.create(createUserDto);
    const payload = newUser.data;

    const token = await this.authService.generateTokens(
      payload.id.toString(),
      payload.email,
      payload.role,
    );
    this.authService.setTokenCookie(
      res,
      'accessToken',
      token.accessToken,
      15 * 60 * 1000,
    );
    return {
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      ...token,
    };
  }
}
