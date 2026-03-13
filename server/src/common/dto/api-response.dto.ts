// src/common/dto/api-response.dto.ts

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export class ApiResponseDto<T = any> implements ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
  }
}