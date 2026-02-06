export class ErrorResponseDto {
  errorCode: string;
  message: string;
}

export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  INQUIRY_NOT_FOUND = 'INQUIRY_NOT_FOUND',
  TEAMS_API_ERROR = 'TEAMS_API_ERROR',
  TEAMS_API_TIMEOUT = 'TEAMS_API_TIMEOUT',
}
