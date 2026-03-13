// src/common/helpers/response.helper.ts

import { ApiResponse } from '../dto/api-response.dto';

export class createResponse {
  /**
   * Success response
   */
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Error response
   */
  static error<T>(error: string, data?: T): ApiResponse<T> {
    return {
      success: false,
      error,
      data,
    };
  }

  /**
   * Custom response
   */
  static custom<T>(
    success: boolean,
    data?: T,
    message?: string,
    error?: string
  ): ApiResponse<T> {
    return {
      success,
      data,
      message,
      error,
    };
  }
}
