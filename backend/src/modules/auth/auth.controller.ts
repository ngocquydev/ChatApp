import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  Get,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../users/users.service.js';
import type { Response as ExpressResponse } from 'express';
import { SignInDto } from './dto/sign-in.dto.js';
import { MultiAuthGuard } from './guards/jwt-auth.guard.js';

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập tài khoản và trả về cặp Access/Refresh Token',
  })
  async login(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const { email, password } = signInDto;
    const result = await this.authService.signIn(email, password);
    this.authService.setTokenCookie(
      res,
      'accessToken',
      result.accessToken,
      15 * 60 * 1000,
    );
    this.authService.setTokenCookie(
      res,
      'refreshToken',
      result.refreshToken,
      7 * 24 * 60 * 60 * 1000,
    );

    return result;
  }
  @Post('refresh')
  @ApiOperation({
    summary: 'Làm mới Access Token từ Refresh Token trong cookie',
  })
  @Post('refresh')
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const token = (req as any).cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token!');
    }

    const result = await this.authService.refreshTokens(token);

    this.authService.setTokenCookie(
      res,
      'accessToken',
      result.accessToken,
      15 * 60 * 1000,
    );

    return {
      success: true,
      message: 'Làm mới Access Token thành công!',
      accessToken: result.accessToken,
    };
  }
  @UseGuards(MultiAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: Request) {
    return {
      message: 'Token hợp lệ!',
      user: (req as any).user,
    };
  }
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đăng xuất tài khoản, xóa token trong DB và đưa vào Redis Blacklist',
  })
  @UseGuards(MultiAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const userId = (req as any).user?.['sub'] || (req as any).user?.id;

    const accessToken = (req as any).cookies?.['accessToken'];

    if (userId) {
      await this.authService.logout(userId, accessToken);
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return {
      success: true,
      message: 'Đăng xuất thành công!',
    };
  }
}
