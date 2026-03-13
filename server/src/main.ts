import { NestFactory } from '@nestjs/core';

import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { GENERATE_WALLET_QUEUE, INVESTMENT_DEAD_QUEUE, INVESTMENT_QUEUE, INVESTMENT_REQ_REVIEW_QUEUE, TX_FILTERING_QUEUE, TX_PROCESSING_QUEUE } from './constants/queue';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: ['e']
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.use(cookieParser());
  app.enableCors({
    origin: ['http://10.130.155.6:8080', 'http://localhost:8080', 'http://localhost:8081'],
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Apply response interceptor globally
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Get the queue from the app
  const txFilteringQueue = app.get<Queue>(`BullQueue_${TX_FILTERING_QUEUE}`);
  const txProcessingQueue = app.get<Queue>(`BullQueue_${TX_PROCESSING_QUEUE}`);
  const generateWalletQueue = app.get<Queue>(`BullQueue_${GENERATE_WALLET_QUEUE}`);
  const investmentQueue = app.get<Queue>(`BullQueue_${INVESTMENT_QUEUE}`);
  const investmentReqReviewQueue = app.get<Queue>(`BullQueue_${INVESTMENT_REQ_REVIEW_QUEUE}`);
  const investmentDeadQueue = app.get<Queue>(`BullQueue_${INVESTMENT_DEAD_QUEUE}`);

  // Create Bull Board
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(txFilteringQueue),
      new BullMQAdapter(txProcessingQueue),
      new BullMQAdapter(generateWalletQueue),
      new BullMQAdapter(investmentQueue),
      new BullMQAdapter(investmentReqReviewQueue),
      new BullMQAdapter(investmentDeadQueue),
    ],
    serverAdapter: serverAdapter,
  });

  // Mount the Bull Board UI
  app.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
