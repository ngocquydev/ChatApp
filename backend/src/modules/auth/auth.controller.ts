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
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { FirebaseService } from './firebase.service.js';
import { TurnstileService } from './turnstile.service.js';
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly turnstileService: TurnstileService,
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const clientIp =
      (req.headers as any)?.['cf-connecting-ip'] ||
      (req.headers as any)?.['x-forwarded-for'] ||
      (req as any).ip;

    await this.turnstileService.validateTurnstile(
      signInDto.turnstileToken,
      clientIp,
    );

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      message: 'Token hợp lệ!',
      profile: req.user,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đăng xuất tài khoản, xóa token trong DB và đưa vào Redis Blacklist',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = (req as any).user;
    const userId = user?._id || user?.id || user?.sub;

    const accessToken = (req as any).cookies?.['accessToken'];

    if (userId) {
      await this.authService.logout(userId.toString(), accessToken);
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
  @Post('firebase-login')
  async firebaseLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const headers = req.headers as any;
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Thiếu hoặc sai định dạng Authorization Header',
      );
    }

    const idToken = authHeader.split(' ')[1];

    // Gọi Service xác thực
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    if (!email) {
      throw new UnauthorizedException(
        'Tài khoản Firebase không cung cấp Email hợp lệ',
      );
    }
    await this.userService.findOrCreateFirebase({
      name: name,
      email: email,
      firebaseUid: uid,
      avatar: picture,
    });
    const profile = await this.userService.findByUid(uid);
    if (!profile) {
      throw new UnauthorizedException('Không tìm thấy tài khoản người dùng!');
    }

    const tokens = await this.authService.generateTokens(
      profile._id.toString(),
      profile.email,
      profile.role,
    );

    this.authService.setTokenCookie(
      res,
      'accessToken',
      tokens.accessToken,
      15 * 60 * 1000,
    );
    this.authService.setTokenCookie(
      res,
      'refreshToken',
      tokens.refreshToken,
      7 * 24 * 60 * 60 * 1000,
    );

    return {
      success: true,
      message: 'Đăng nhập thành công',
      profile,
      ...tokens,
    };
  }
}
