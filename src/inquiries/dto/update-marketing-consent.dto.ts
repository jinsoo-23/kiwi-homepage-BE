import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Matches,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class GetConsentsQueryDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @Matches(/^[\d-]+$/, {
    message: 'phone must contain only digits and hyphens',
  })
  phone: string;
}

export class UpdateConsentDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @Matches(/^[\d-]+$/, {
    message: 'phone must contain only digits and hyphens',
  })
  phone: string;

  @IsString()
  @IsIn(['MARKETING', 'PRIVACY'], {
    message: 'consentType must be one of: MARKETING, PRIVACY',
  })
  consentType: 'MARKETING' | 'PRIVACY';

  @IsBoolean()
  consented: boolean;
}

export class ConsentStatusDto {
  consentType: string;
  consented: boolean;
  updatedAt: Date;
}

export class GetConsentsResponseDto {
  email: string;
  consents: ConsentStatusDto[];
}

export class UpdateConsentResponseDto {
  consentType: string;
  consented: boolean;
  updatedAt: Date;
}
