import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionDetails {
  status: number;
  message: string;
  error: string;
}

function extractExceptionDetails(exception: unknown): ExceptionDetails {
  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let error = 'Internal Server Error';

  if (exception instanceof HttpException) {
    const httpException = exception as HttpException;
    status = httpException.getStatus();
    const exceptionResponse = httpException.getResponse();
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = String(resp.message ?? httpException.message);
      error = String(resp.error ?? httpException.name);
    } else {
      message = httpException.message;
      error = httpException.name;
    }
  } else if (exception instanceof Error) {
    message = exception.message || message;
    error = exception.name || error;
  }

  return { status, message, error };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = extractExceptionDetails(exception);

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}