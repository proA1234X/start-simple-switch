export type Currency = 'SDG' | 'AED';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';

export type ExchangeDirection = 'normal' | 'reverse'; // normal: AED to SDG, reverse: SDG to AED

export type TransactionStatus = 'pending' | 'confirmed' | 'approved' | 'cancelled';

export type UserRole = 'admin' | 'accountant' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface Vault {
  id: string;
  name: string;
  balanceSDG: number;
  balanceAED: number;
  initialBalanceSDG?: number;
  initialBalanceAED?: number;
  description?: string;
  isMainVault?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
  balanceSDG: number;
  balanceAED: number;
  isRecurring: boolean;
  hasBanakAccount?: boolean;
  createdAt: string;
}

export interface ExchangeRate {
  id: string;
  buyRate: number;
  sellRate: number;
  updatedAt: string;
  updatedBy: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  vaultId?: string;
  customerId?: string;
  exchangeRate?: number;
  profitLoss?: number;
  fromVaultId?: string;
  toVaultId?: string;
  fromCustomerId?: string;
  toCustomerId?: string;
  fromCurrency?: Currency;
  toCurrency?: Currency;
  exchangeDirection?: ExchangeDirection;
  isDirectDelivery?: boolean;
  notes?: string;
  createdAt: string;
  createdBy: string;
  confirmedAt?: string;
  confirmedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}
