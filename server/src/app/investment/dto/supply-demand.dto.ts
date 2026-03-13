import { IsOptional, IsString, Matches } from 'class-validator';

export class SupplyDemandDto {
  @IsString()
  @Matches(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
  from: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
  to?: string;
}
