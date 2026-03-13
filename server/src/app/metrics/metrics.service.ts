import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpHistogram: client.Histogram<string>;

  constructor() {
    client.collectDefaultMetrics();

    this.httpHistogram = new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in ms',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [50, 100, 200, 300, 500, 1000, 2000],
    });
  }

  startTimer() {
    return this.httpHistogram.startTimer();
  }

  async getMetrics() {
    return client.register.metrics();
  }

  getContentType() {
    return client.register.contentType;
  }
}