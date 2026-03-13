import { IsNumber, IsPositive, IsOptional, IsString, IsEnum } from 'class-validator';
import { InvestmentStatus } from '../investment.entity';

export class UpdateInvestmentDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsEnum(InvestmentStatus)
  status?: InvestmentStatus;

  @IsOptional()
  @IsString()
  note?: string;
}