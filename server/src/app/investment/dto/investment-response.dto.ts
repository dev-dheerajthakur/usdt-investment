export class InvestmentResponseDto {
  id: string;
  userId: string;
  amount: number;
  status: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InvestmentStatsDto {
  totalInvestment: number;
  totalActive: number;
  totalMatured: number;
  totalWithdrawn: number;
  totalCount: number;
}

export class PaginatedInvestmentDto {
  data: InvestmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}