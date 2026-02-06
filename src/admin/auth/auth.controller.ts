import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string; name: string };
  cookies: { refreshToken?: string };
}

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
};

@Controller('api/v1/admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin',
      maxAge: 60 * 60 * 1000, // 1시간
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return { user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않은 Refresh Token입니다',
      });
    }

    const result = await this.authService.refresh(refreshToken);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin',
      maxAge: 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);

    res.cookie('accessToken', '', {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin',
      maxAge: 0,
    });

    res.cookie('refreshToken', '', {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin/auth',
      maxAge: 0,
    });

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: RequestWithUser) {
    return { user: req.user };
  }
}
