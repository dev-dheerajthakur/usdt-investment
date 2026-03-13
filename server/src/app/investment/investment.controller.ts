import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Header,
  Headers,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/investment-query.dto';
import type { Request } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { INVESTMENT_QUEUE } from 'src/constants/queue';
import { Queue } from 'bullmq';
import { createResponse } from 'src/common/helper/response.helper';
import { AuthGuard } from 'src/common/guards/authorization.guard';
import { SupplyDemandDto } from './dto/supply-demand.dto';
import { QueryExpressionMap } from 'typeorm/query-builder/QueryExpressionMap.js';

interface AuthRequest extends Request {
  userId: string;
}

@Controller({ path: 'investment', version: '1' })
export class InvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    @InjectQueue(INVESTMENT_QUEUE)
    private readonly investmentQueue: Queue,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getInvestment(@Req() req: AuthRequest) {
    const investments = await this.investmentService.findInvestments(
      req.userId,
    );
    return createResponse.success(investments);
  }
  // POST /investments
  // @UseGuards(AuthGuard)
  @Post()
  async create(@Body() payload: CreateInvestmentDto) {
    const { processId, message } = await this.investmentService.create(payload);
    return createResponse.success({ processId }, message);
  }
  @Post('load-balances')
  async loadBalances() {
    const result = await this.investmentService.loadBalances();
    return createResponse.success(result);
  }

  @Get('units')
  async getUnits() {
    return await this.investmentService.calculateUnits()
  }

  @Get('supply-demand')
  async getSupplyAndDemand(
    @Query() query: SupplyDemandDto,
  ) {
    const [fromMonth, fromDate, fromYear] = query.from.split("/").map(e => Number(e));
    const [toMonth, toDate, toYear] = query.to?.split("/").map(e => Number(e)) ?? query.from.split("/").map(e => Number(e));

    const range: [Date, Date] = [
      new Date(Date.UTC(fromYear, fromMonth-1, fromDate)),
      new Date(Date.UTC(toYear, toMonth-1, toDate))
    ]
    return await this.investmentService.getAnalytics(range);
  }

  // GET /investments?userId=&status=&from=&to=&page=&limit=
  // @Get()
  // findAll(@Query() query: InvestmentQueryDto) {
  //   return this.investmentService.findAll(query);
  // }

  // GET /investments/stats  (global)
  @Get('stats')
  getGlobalStats() {
    return this.investmentService.getGlobalStats();
  }

  // GET /investments/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentService.findOne(id);
  }

  // GET /investments/user/:userId/stats
  @Get('user/:userId/stats')
  getStatsByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.investmentService.getStatsByUser(userId);
  }

  // PATCH /investments/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investmentService.update(id, dto);
  }

  // DELETE /investments/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentService.remove(id);
  }
}
