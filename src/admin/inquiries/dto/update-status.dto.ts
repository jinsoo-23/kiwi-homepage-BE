import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['PENDING', 'COMPLETED'], {
    message: '상태는 PENDING 또는 COMPLETED만 가능합니다',
  })
  status: 'PENDING' | 'COMPLETED';
}
