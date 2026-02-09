import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestWithUser extends FastifyRequest {
  user: { id: string; email: string; name: string };
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
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(loginDto);

    res.setCookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin',
      maxAge: 60 * 60, // 1시간 (초 단위)
    });

    res.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin/auth',
      maxAge: 7 * 24 * 60 * 60, // 7일 (초 단위)
    });

    return { user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않은 Refresh Token입니다',
      });
    }

    const result = await this.authService.refresh(refreshToken);

    res.setCookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/admin',
      maxAge: 60 * 60,
    });

    return { success: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logout(req.user.id);

    res.clearCookie('accessToken', {
      path: '/api/v1/admin',
    });

    res.clearCookie('refreshToken', {
      path: '/api/v1/admin/auth',
    });

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: RequestWithUser) {
    return { user: req.user };
  }
}
