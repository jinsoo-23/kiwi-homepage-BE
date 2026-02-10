import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../../shared/database/drizzle.provider';
import type { DrizzleDB } from '../../shared/database/drizzle.provider';
import { users } from '../../shared/database/schema';
import { LoginDto } from './dto/login.dto';
import { verifyPassword, hashPassword, needsRehash } from '../../shared/crypto';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtRefreshSecret: string;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtRefreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
      });
    }

    // 점진적 마이그레이션: bcrypt → argon2 재해시
    if (needsRehash(user.password)) {
      const newHash = await hashPassword(password);
      await this.db
        .update(users)
        .set({ password: newHash })
        .where(eq(users.id, user.id));
      this.logger.log(
        `사용자 ${user.email} 비밀번호를 Argon2로 마이그레이션 완료`,
      );
    }

    const tokens = this.generateTokens(user.id, user.email);

    await this.db
      .update(users)
      .set({ refreshToken: tokens.refreshToken })
      .where(eq(users.id, user.id));

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException({
          errorCode: 'INVALID_REFRESH_TOKEN',
          message: '유효하지 않은 Refresh Token입니다',
        });
      }

      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '1h' },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException({
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않은 Refresh Token입니다',
      });
    }
  }

  async logout(userId: string) {
    await this.db
      .update(users)
      .set({ refreshToken: null })
      .where(eq(users.id, userId));

    return { success: true };
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
