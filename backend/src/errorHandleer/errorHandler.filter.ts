import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorHandler } from './types/errorHandler.type.js';

interface MongoError extends Error {
  code?: number | string;
  keyPattern?: Record<string, unknown>;
}

@Catch()
export class ErrorHandlerFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorHandlerFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau!';
    let error = 'Internal Server Error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          errors = resObj.message.map((m) => String(m));
          message = errors.join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = exception.message;
        }

        if (typeof resObj.error === 'string') {
          error = resObj.error;
        } else {
          error = exception.name;
        }
      }
    } else if (exception instanceof Error) {
      const err = exception as MongoError;

      if (err.code === 11000 || err.name === 'MongoServerError') {
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        const duplicateFields = err.keyPattern
          ? Object.keys(err.keyPattern).join(', ')
          : 'Trường dữ liệu';
        message = `${duplicateFields} đã tồn tại trong hệ thống!`;
      } else if (err.name === 'CastError') {
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'Định dạng dữ liệu hoặc ID không hợp lệ!';
      } else if (err.name === 'ValidationError') {
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Validation Error';
        message = err.message;
      } else if (err.name === 'TokenExpiredError') {
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
        message = 'Token xác thực đã hết hạn. Vui lòng đăng nhập lại!';
      } else if (err.name === 'JsonWebTokenError') {
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
        message = 'Token xác thực không hợp lệ!';
      } else {
        this.logger.error(
          `[500 Internal Error] ${request.method} ${request.url} - ${err.message}`,
          err.stack,
        );
      }
    }

    if (statusCode >= 400 && statusCode < 500) {
      this.logger.warn(
        `[${statusCode}] ${request.method} ${request.url} - ${message}`,
      );
    }

    const errorResponse: errorHandler = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors ? { errors } : {}),
    };

    response.status(statusCode).json(errorResponse);
  }
}
