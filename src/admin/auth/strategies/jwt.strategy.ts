import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../../../shared/database/drizzle.provider';
import type { DrizzleDB } from '../../../shared/database/drizzle.provider';
import { users } from '../../../shared/database/schema';

interface JwtPayload {
  sub: string;
  email: string;
}

function extractJwtFromCookie(req: FastifyRequest): string | null {
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken as string;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-jwt-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return user;
  }
}
