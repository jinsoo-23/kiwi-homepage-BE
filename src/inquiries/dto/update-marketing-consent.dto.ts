import { IsString, IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class UpdateMarketingConsentDto {
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

export class UpdateMarketingConsentResponseDto {
  marketingConsent: boolean;
}
