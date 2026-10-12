import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { ErrorHandlerFilter } from './errorHandler.filter.js';
import { Request, Response } from 'express';

describe('ErrorHandlerFilter', () => {
  let filter: ErrorHandlerFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    filter = new ErrorHandlerFilter();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      status: statusMock as unknown as Response['status'],
    };

    mockRequest = {
      url: '/test-route',
      method: 'POST',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
        getNext: vi.fn(),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle standard HttpException correctly', () => {
    const exception = new BadRequestException('Email không hợp lệ');

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Email không hợp lệ',
        path: '/test-route',
      }),
    );
  });

  it('should format validation errors array properly', () => {
    const exception = new BadRequestException({
      message: ['Email là bắt buộc', 'Mật khẩu quá ngắn'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Email là bắt buộc, Mật khẩu quá ngắn',
        errors: ['Email là bắt buộc', 'Mật khẩu quá ngắn'],
        path: '/test-route',
      }),
    );
  });

  it('should handle MongoDB duplicate key error (code 11000)', () => {
    const error = new Error('E11000 duplicate key') as Error & {
      code: number;
      keyPattern: Record<string, number>;
    };
    error.code = 11000;
    error.keyPattern = { email: 1 };

    filter.catch(error, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'email đã tồn tại trong hệ thống!',
        error: 'Conflict',
      }),
    );
  });

  it('should handle TokenExpiredError as 401 Unauthorized', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';

    filter.catch(error, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Token xác thực đã hết hạn. Vui lòng đăng nhập lại!',
      }),
    );
  });

  it('should handle generic uncaught Error as 500 Internal Server Error', () => {
    const error = new Error('Database connection failed');

    filter.catch(error, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau!',
        error: 'Internal Server Error',
      }),
    );
  });
});
