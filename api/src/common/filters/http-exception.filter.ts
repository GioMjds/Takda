import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ValidationException,
} from '../exceptions/domain.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: Record<string, unknown> = {
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      responseBody =
        typeof resContent === 'string'
          ? { message: resContent }
          : (resContent as Record<string, unknown>);
    } else if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      responseBody = { message: exception.message, error: 'Not Found' };
    } else if (exception instanceof ConflictException) {
      status = HttpStatus.CONFLICT;
      responseBody = { message: exception.message, error: 'Conflict' };
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      responseBody = { message: exception.message, error: 'Unauthorized' };
    } else if (exception instanceof ValidationException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      responseBody = {
        message: exception.message,
        errors: exception.errors,
        error: 'Unprocessable Entity',
      };
    } else if (exception instanceof DomainException) {
      status = HttpStatus.BAD_REQUEST;
      responseBody = { message: exception.message, error: 'Bad Request' };
    }

    this.logger.error(`${req.method} ${req.url} -> ${status}`);

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...responseBody,
    });
  }
}
