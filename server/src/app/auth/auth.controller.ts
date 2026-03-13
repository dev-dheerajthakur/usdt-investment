import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { UserService } from '../users/users.service';
import { ApiResponse } from 'src/common/dto/api-response.dto';
import { createResponse } from 'src/common/helper/response.helper';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const cookies = req.cookies;
    const user = await this.authService.verifyUser(cookies.auth_token);
    return createResponse.success(user);
  }

  @Post('user/login')
  async login(
    @Body() body: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const response = await this.userService.loginUser(body);

    res.cookie('auth_token', response.auth_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 7 days
    });
    return {
      success: true,
      message: 'login successful',
      data: response.user,
    };
  }

  @Post('user/register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const response = await this.userService.createUser(body);

    res.cookie('auth_token', response.auth_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 7 days
    });
    return createResponse.success(response, 'user registered successfully');
  }
}
