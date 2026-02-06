import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        errorCode: 'UNAUTHORIZED',
        message: '인증이 필요합니다',
      });
    }
    return user;
  }
}
