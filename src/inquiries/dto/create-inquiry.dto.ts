import {
  IsString,
  IsEmail,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'companyName is required' })
  companyName: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'phone is required' })
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
  message: string;

  @IsBoolean()
  marketingConsent: boolean;

  @IsBoolean()
  privacyConsent: boolean;
}

export class CreateInquiryResponseDto {
  id: string;
  createdAt: Date;
}
