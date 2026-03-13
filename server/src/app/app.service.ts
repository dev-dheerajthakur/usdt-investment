import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(
  ) {}
  getHello(): string {
    return 'Hello World!';
  }
  ping(): string {
    return 'Pong!';
  }
}
