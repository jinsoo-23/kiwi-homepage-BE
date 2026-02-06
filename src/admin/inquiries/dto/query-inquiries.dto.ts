import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInquiriesDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @IsIn([5, 10, 25])
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED'])
  status?: 'PENDING' | 'COMPLETED';

  @IsOptional()
  @IsIn(['kiwi', 'kiwiFeature', 'kiwiPartnership'])
  inquiryType?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  marketingConsent?: boolean;
}
