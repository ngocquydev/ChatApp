import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    error?: string,
  ) {
    super(
      {
        statusCode,
        message,
        error: error || HttpStatus[statusCode] || 'Application Error',
      },
      statusCode,
    );
  }
}
