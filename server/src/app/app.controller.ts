import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowAnonymous } from 'src/common/decorators/allowAnonymous.decorator';
import type { Request } from 'express';

@Controller({version: '1'})
export class AppController {
  constructor(private readonly appService: AppService) {}
  
  @Get()
  @AllowAnonymous()
  ping(
    @Req() req: Request
  ): string {
    console.log(req.ip)
    return this.appService.ping();
  }
}
