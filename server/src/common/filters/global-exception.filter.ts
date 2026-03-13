// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle different exception types
    if (exception instanceof HttpException) {
      // NestJS HTTP exceptions (NotFoundException, BadRequestException, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }

      this.logger.warn(`HTTP Exception: ${status} - ${message}`, {
        path: request.url,
        method: request.method,
      });

    } else if (exception instanceof QueryFailedError) {
      // TypeORM/Database errors
      const dbError = this.handleDatabaseError(exception);
      status = dbError.status;
      message = dbError.message;
      error = dbError.error;

      // this.logger.error('Database Error:', {
      //   message: exception.message,
      //   query: exception.query,
      //   parameters: exception.parameters,
      //   path: request.url,
      // });

    } else if (exception instanceof Error) {
      // Generic JavaScript errors
      const handledError = this.handleGenericError(exception);
      status = handledError.status;
      message = handledError.message;
      error = handledError.error;

      // this.logger.error('Application Error:', {
      //   name: exception.name,
      //   message: exception.message,
      //   stack: exception.stack,
      //   path: request.url,
      // });

    } else {
      // Unknown errors
      this.logger.error('Unknown Error:', {
        exception,
        path: request.url,
      });
    }

    // Send response
    response.status(status).json({
      success: false,
      error: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === 'development' && {
        details: exception instanceof Error ? exception.message : exception,
      }),
    });
  }

  /**
   * Handle TypeORM/PostgreSQL database errors
   */
  private handleDatabaseError(exception: QueryFailedError): {
    status: number;
    message: string;
    error: string;
  } {
    const error = exception as any;

    switch (error.code) {
      // PostgreSQL error codes
      case '23505': // Unique violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Duplicate Entry',
        };

      case '23503': // Foreign key violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
          error: 'Foreign Key Violation',
        };

      case '23502': // Not null violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'Missing Required Field',
        };

      case '22P02': // Invalid text representation (e.g., invalid UUID)
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format provided',
          error: 'Invalid Format',
        };

      case '42703': // Undefined column
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database schema error - column not found',
          error: 'Schema Error',
        };

      case '42P01': // Undefined table
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database schema error - table not found',
          error: 'Schema Error',
        };

      case '42601': // Syntax error
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database query syntax error',
          error: 'Query Syntax Error',
        };

      case '42501': // Insufficient privilege
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Insufficient database permissions',
          error: 'Permission Denied',
        };

      case '53300': // Too many connections
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection pool exhausted',
          error: 'Service Unavailable',
        };

      case '57014': // Query canceled (timeout)
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          message: 'Database query timeout',
          error: 'Query Timeout',
        };

      case '08006': // Connection failure
      case '08001': // Unable to connect
      case '08004': // Connection rejected
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection failed',
          error: 'Database Unavailable',
        };

      case '40001': // Serialization failure
        return {
          status: HttpStatus.CONFLICT,
          message: 'Transaction conflict - please retry',
          error: 'Transaction Conflict',
        };

      case '22001': // String data right truncation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Data too long for field',
          error: 'Data Too Long',
        };

      case '22003': // Numeric value out of range
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Numeric value out of range',
          error: 'Invalid Number',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Database Error',
        };
    }
  }

  /**
   * Handle generic JavaScript errors
   */
  private handleGenericError(exception: Error): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.name) {
      case 'ValidationError':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: exception.message || 'Validation failed',
          error: 'Validation Error',
        };

      case 'TypeError':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Invalid data type encountered',
          error: 'Type Error',
        };

      case 'ReferenceError':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Reference to undefined variable',
          error: 'Reference Error',
        };

      case 'SyntaxError':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Syntax error in code',
          error: 'Syntax Error',
        };

      case 'RangeError':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Value out of valid range',
          error: 'Range Error',
        };

      case 'TimeoutError':
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          message: 'Request timeout',
          error: 'Timeout',
        };

      case 'JsonWebTokenError':
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid authentication token',
          error: 'Invalid Token',
        };

      case 'TokenExpiredError':
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'Authentication token expired',
          error: 'Token Expired',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message || 'An unexpected error occurred',
          error: 'Internal Server Error',
        };
    }
  }
}