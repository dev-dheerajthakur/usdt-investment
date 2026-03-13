import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';
import { createResponse } from 'src/common/helper/response.helper';
import { AuthGuard } from 'src/common/guards/authorization.guard';
import type { Request } from 'express';

interface Req extends Request {
  polygonAddress: string;
}

@Controller({ path: 'transaction', version: '1' })
export class TransactionsController {
  constructor(private readonly transactionService: TransactionsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getTransactions(@Req() req: Req) {
    const transactions = await this.transactionService.findByUserAddress(req.polygonAddress);
    return createResponse.success({
      length: transactions.length,
      transactions,
    });
  }

  @Get('add')
  addQueue() {
    this.transactionService.addQueue();
    return 'hilo';
  }

  // @Post('create')
  // async createTransaction(
  //   @Body() body: CreateTransactionDto
  // ) {
  //   return await this.transactionService.create(body)
  // }
}
