import { IsNumber, IsString, Length, Matches, Max, Min} from 'class-validator';

export class CreateInvestmentDto {
  @IsNumber()
  @Min(1, { message: 'Unit must be at least 1' })
  @Max(10, { message: 'Unit cannot exceed 10' })
  unit: number;

  @IsString({message: 'Polygon address must be a string'})
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Polygon address format',
  })
  polygonAddress: string;
}