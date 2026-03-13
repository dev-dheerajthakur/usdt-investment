
type AuthTokenPayload = {
  email: string;
  id: string;
};
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

/**
 * REGISTER USER
 */

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  referred_by: string;
  externalPolygonAddress: string;
};

type RegisterData = {
  auth_token: string;
};

/**
 * LOGIN USER
 */

type LoginPayload = {
  email: string;
  password: string;
};

type LoginData = {
  auth_token: string;
};

/**
 * GET USER PROFILE BY AUTH_TOKEN [COOKIES]
 */

enum UserStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: UserStatus;
  usdtBalance: string;
  referralCode: string;
  referred_by: string;
  created_at: string;
  polygonAddress?: string;
  usdtChainBalance: string;
  externalPolygonAddress: string;
};

/**
 * TRANSACTIONS 
 */

enum TransactionType {
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSITE = 'DEPOSITE',
  PURCHASE = 'PURCHASE'
}
enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED'
}

type Transaction = {
  type: TransactionType,
  amount: string,
  Balance: string,
  status: TransactionStatus,
  data: Date,
}

type TransactionData = {
  totalDeposite: string,
  totalWithdrawal: string,
  totalPurchase: string,
  totalTransactions: Transaction[]
}

/**
 * INVESTMENT
 */
enum InvestmentStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED', 
  FAILED = 'FAILED'
}
type InvestmentPayload = {
  units: string
}

type InvestmentData = {
  id: string,
  units: string,
  user: string,
  status: InvestmentStatus,
  createdAt: string,
}