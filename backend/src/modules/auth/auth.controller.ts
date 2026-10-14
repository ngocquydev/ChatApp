import {
  Controller,
  Post,
  Patch,
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
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { SignInDto } from './dto/sign-in.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { FirebaseService } from './firebase.service.js';
import { TurnstileService } from './turnstile.service.js';
import type {
  AuthenticatedRequest,
  RequestWithCookies,
  UpdateProfileResponse,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  VerifyOtpResponse,
  ResetPasswordResponse,
} from './types/auth.types.js';

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 giờ
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày

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
      ACCESS_TOKEN_MAX_AGE,
    );
    this.authService.setTokenCookie(
      res,
      'refreshToken',
      token.refreshToken,
      REFRESH_TOKEN_MAX_AGE,
    );
    return {
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      profile: {
        _id: payload.id.toString(),
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        avatar: payload.avatar,
      },
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
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const rawForwarded = req.headers['x-forwarded-for'];
    const forwardedIp =
      typeof rawForwarded === 'string'
        ? rawForwarded.split(',')[0].trim()
        : Array.isArray(rawForwarded)
          ? rawForwarded[0]
          : undefined;

    const clientIp =
      (req.headers['cf-connecting-ip'] as string | undefined) ||
      forwardedIp ||
      req.ip ||
      '';

    const turnstileToken =
      signInDto['cf-turnstile-response'] || signInDto.turnstileToken;

    await this.turnstileService.validateTurnstile(
      turnstileToken,
      clientIp,
      'login',
    );

    const { email, password } = signInDto;
    const result = await this.authService.signIn(email, password);
    this.authService.setTokenCookie(
      res,
      'accessToken',
      result.accessToken,
      ACCESS_TOKEN_MAX_AGE,
    );
    this.authService.setTokenCookie(
      res,
      'refreshToken',
      result.refreshToken,
      REFRESH_TOKEN_MAX_AGE,
    );

    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu gửi mã OTP đặt lại mật khẩu qua email',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực mã OTP 6 số để nhận Reset Token',
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<VerifyOtpResponse> {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đặt lại mật khẩu mới bằng Reset Token',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
    );
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Làm mới Access Token từ Refresh Token trong cookie',
  })
  async refreshTokens(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token!');
    }

    const result = await this.authService.refreshTokens(token);

    this.authService.setTokenCookie(
      res,
      'accessToken',
      result.accessToken,
      ACCESS_TOKEN_MAX_AGE,
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
  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({
    summary: 'Cập nhật thông tin tài khoản cá nhân',
  })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponse> {
    const userId =
      req.user._id?.toString() || req.user.id?.toString() || req.user.sub;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được danh tính người dùng');
    }
    return this.authService.updateProfile(userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đổi mật khẩu tài khoản người dùng',
  })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    const userId =
      req.user._id?.toString() || req.user.id?.toString() || req.user.sub;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được danh tính người dùng');
    }
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đăng xuất tài khoản, xóa token trong DB và đưa vào Redis Blacklist',
  })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = req.user;
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub;

    const accessToken = req.cookies?.['accessToken'];

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
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const authHeader = req.headers.authorization;

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
      ACCESS_TOKEN_MAX_AGE,
    );
    this.authService.setTokenCookie(
      res,
      'refreshToken',
      tokens.refreshToken,
      REFRESH_TOKEN_MAX_AGE,
    );

    return {
      success: true,
      message: 'Đăng nhập thành công',
      profile,
      ...tokens,
    };
  }
}
