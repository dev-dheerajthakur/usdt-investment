import { IsEnum, IsNotEmpty, IsString, IsOptional, Matches, ValidateIf, IsNumberString, IsEthereumAddress } from 'class-validator';
import { TransactionType, TransactionStatus } from '../transactions.entity';

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'From address is required' })
  @IsEthereumAddress({ message: 'From address must be a valid Ethereum/Polygon address' })
  fromAddress: string;

  @IsNotEmpty({ message: 'To address is required' })
  @IsEthereumAddress({ message: 'To address must be a valid Ethereum/Polygon address' })
  toAddress: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumberString({}, { message: 'Amount must be a valid number string' })
  @Matches(/^\d+(\.\d{1,8})?$/, { 
    message: 'Amount must be a valid decimal with up to 8 decimal places' 
  })
  amount: string;

  @IsNotEmpty({ message: 'Transaction type is required' })
  @IsEnum(TransactionType, { 
    message: 'Type must be one of: deposit, purchase, transfer' 
  })
  type: TransactionType;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}