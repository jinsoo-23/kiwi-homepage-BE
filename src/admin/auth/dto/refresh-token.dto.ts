import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh Token은 문자열이어야 합니다' })
  refreshToken: string;
}
