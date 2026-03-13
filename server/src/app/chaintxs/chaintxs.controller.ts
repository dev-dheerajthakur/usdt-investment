import { Body, Controller, Post } from '@nestjs/common';
import { ChaintxsService } from './chaintxs.service';
import { createResponse } from 'src/common/helper/response.helper';



export interface Tx {
  blockHash: string;
  blockNumber: string;
  data: string;
  from: string;
  to: string;
  value: string;
  transactionHash: string;
  transactionIndex: string;
}


@Controller({path: 'chaintxs', version: '1'})
export class ChaintxsController {
  constructor(
    private readonly chainTxsService: ChaintxsService
  ) {}
  @Post()
  async createChainTxs(@Body() body: { to: string; from: string, value: string }) {
    const tx = await this.chainTxsService.processTx({
      blockHash: '#',
      blockNumber: '0',
      data: "*",
      fromAddress: body.from,
      toAddress: body.to,
      value: body.value,
      transactionHash: '##',
      transactionIndex: '00'
    });
    return createResponse.success(tx)
  }
}
