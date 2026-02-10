import {
  IsString,
  IsEmail,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name must be at most 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'companyName is required' })
  @MaxLength(200, { message: 'companyName must be at most 200 characters' })
  companyName: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  @MaxLength(255, { message: 'email must be at most 255 characters' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
  @MaxLength(20, { message: 'phone must be at most 20 characters' })
  @Matches(/^\+?[\d-]+$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @IsString()
  @IsIn(['kiwi', 'kiwiFeature', 'kiwiPartnership'], {
    message: 'inquiryType must be one of: kiwi, kiwiFeature, kiwiPartnership',
  })
  inquiryType: string;

  @IsString()
  @IsNotEmpty({ message: 'message is required' })
  @MaxLength(5000, { message: 'message must be at most 5000 characters' })
  message: string;

  @IsBoolean()
  marketingConsent: boolean;

  @IsBoolean()
  privacyConsent: boolean;
}

export class CreateInquiryResponseDto {
  id: string;
  createdAt: Date;
  hasPreviousInquiry: boolean;
  message?: string;
}
