// src/types/account.ts
// PIMPAY Banking Portal - Account Type Definitions

export enum AccountType {
  CACC = 'CACC', // Current Account
  BIZZ = 'BIZZ', // Business Account
  SVGS = 'SVGS', // Savings Account
  EWLT = 'EWLT', // E-Wallet
  CWLT = 'CWLT', // Crypto Wallet
  PIWT = 'PIWT', // Pi Wallet
  NSVR = 'NSVR', // Nostro/Vostro Account
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  CLOSED = 'CLOSED',
  FROZEN = 'FROZEN',
  PENDING = 'PENDING',
}

export enum RelationshipType {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  NESTED = 'NESTED',
}

export enum SweepRuleType {
  THRESHOLD = 'THRESHOLD',
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CreditDebitIndicator {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum CorrespondentBankStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum FXRateSource {
  ECB = 'ECB',
  REUTERS = 'REUTERS',
  BLOOMBERG = 'BLOOMBERG',
  INTERNAL = 'INTERNAL',
  MANUAL = 'MANUAL',
}

export enum NostroVostroType {
  NOSTRO = 'NOSTRO', // Our account held at another bank
  VOSTRO = 'VOSTRO', // Another bank's account held at our institution
}

export interface Account {
  id: string;
  accountNumber: string;
  iban: string | null;
  bic: string | null;
  name: string;
  type: AccountType;
  currency: string;
  availableBalance: number;
  bookedBalance: number;
  pendingBalance: number;
  status: AccountStatus;
  ownerId: string;
  ownerName: string;
  correspondentBankId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSummary {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  currency: string;
  availableBalance: number;
  status: AccountStatus;
}

export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  currency: string;
  availableBalance: number;
  bookedBalance: number;
  pendingBalance: number;
  lastUpdated: Date;
}

export interface AccountFilter {
  type?: AccountType | AccountType[];
  status?: AccountStatus | AccountStatus[];
  currency?: string | string[];
  ownerId?: string;
  correspondentBankId?: string;
  searchQuery?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface CorrespondentBank {
  id: string;
  bankName: string;
  bic: string;
  swiftCode: string;
  country: string;
  relationshipType: RelationshipType;
  nostroAccountId: string | null;
  vostroAccountId: string | null;
  dailyLimit: number;
  usedLimit: number;
  status: CorrespondentBankStatus;
  contactEmail: string;
  contactPhone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CorrespondentBankSummary {
  id: string;
  bankName: string;
  bic: string;
  country: string;
  relationshipType: RelationshipType;
  status: CorrespondentBankStatus;
  availableLimit: number;
}

export interface CorrespondentBankLimit {
  correspondentBankId: string;
  dailyLimit: number;
  usedLimit: number;
  remainingLimit: number;
  limitUtilizationPercentage: number;
  resetAt: Date;
}

export interface StatementEntry {
  entryId: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  creditDebit: CreditDebitIndicator;
  balance: number;
  reference: string;
  valueDate?: Date;
  counterpartyName?: string;
  counterpartyAccount?: string;
  transactionCode?: string;
  additionalInfo?: string;
}

export interface BankStatement {
  id: string;
  accountId: string;
  statementId: string;
  fromDate: Date;
  toDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  entryCount: number;
  entries: StatementEntry[];
  generatedAt: Date;
  currency?: string;
  accountNumber?: string;
  accountName?: string;
  iban?: string;
}

export interface StatementFilter {
  accountId: string;
  fromDate: Date;
  toDate: Date;
  creditDebit?: CreditDebitIndicator;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface FXRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  buyRate: number;
  sellRate: number;
  midRate: number;
  spread: number;
  source: FXRateSource;
  validFrom: Date;
  validTo: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FXRateSnapshot {
  baseCurrency: string;
  quoteCurrency: string;
  midRate: number;
  buyRate: number;
  sellRate: number;
  spread: number;
  source: FXRateSource;
  timestamp: Date;
}

export interface FXConversionRequest {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  direction: 'FROM' | 'TO';
}

export interface FXConversionResult {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  appliedRate: number;
  spread: number;
  rateId: string;
  validUntil: Date;
}

export interface NostroVostroPosition {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  correspondentBankId: string;
  correspondentBankName: string;
  positionType: NostroVostroType;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  pendingCredits: number;
  pendingDebits: number;
  projectedBalance: number;
  minimumBalance: number;
  maximumBalance: number;
  targetBalance: number;
  lastReconciled: Date | null;
  reconciledBalance: number | null;
  reconciledDifference: number | null;
  country: string;
  bic: string;
  swiftCode: string;
  valueDate: Date;
  updatedAt: Date;
}

export interface NostroVostroReconciliation {
  positionId: string;
  accountId: string;
  reconciledAt: Date;
  reconciledBy: string;
  ourBalance: number;
  theirBalance: number;
  difference: number;
  status: 'MATCHED' | 'UNMATCHED' | 'PARTIALLY_MATCHED';
  notes: string | null;
  breakItems: ReconciliationBreakItem[];
}

export interface ReconciliationBreakItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  source: 'OUR_RECORDS' | 'THEIR_RECORDS';
  status: 'OPEN' | 'RESOLVED' | 'DISPUTED';
}

export interface TreasuryPosition {
  currency: string;
  nostroTotal: number;
  vostroTotal: number;
  netPosition: number;
  pendingSettlements: number;
  projectedPosition: number;
  riskExposure: number;
  positions: NostroVostroPosition[];
}

export interface SweepRule {
  id: string;
  accountId: string;
  type: SweepRuleType;
  threshold: number;
  targetAccount: string;
  amount: number;
  active: boolean;
  name?: string;
  description?: string;
  minimumBalance?: number;
  maximumBalance?: number;
  percentage?: number;
  frequency?: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  lastExecuted?: Date | null;
  nextExecution?: Date | null;
  executionCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SweepExecution {
  id: string;
  sweepRuleId: string;
  accountId: string;
  targetAccountId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  executedAt: Date;
  reference: string;
  errorMessage?: string | null;
}

export interface AccountCreateRequest {
  name: string;
  type: AccountType;
  currency: string;
  ownerId: string;
  ownerName: string;
  initialDeposit?: number;
  correspondentBankId?: string;
  iban?: string;
  bic?: string;
}

export interface AccountUpdateRequest {
  id: string;
  name?: string;
  status?: AccountStatus;
  correspondentBankId?: string | null;
}

export interface AccountListResponse {
  accounts: Account[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AccountStatistics {
  totalAccounts: number;
  activeAccounts: number;
  dormantAccounts: number;
  frozenAccounts: number;
  pendingAccounts: number;
  closedAccounts: number;
  byType: Record<AccountType, number>;
  byCurrency: Record<string, number>;
  totalBalanceByCurrency: Record<string, number>;
}

export type AccountWithBalance = Account & AccountBalance;

export type AccountTypeLabel = {
  [key in AccountType]: string;
};

export const ACCOUNT_TYPE_LABELS: AccountTypeLabel = {
  [AccountType.CACC]: 'Current Account',
  [AccountType.BIZZ]: 'Business Account',
  [AccountType.SVGS]: 'Savings Account',
  [AccountType.EWLT]: 'E-Wallet',
  [AccountType.CWLT]: 'Crypto Wallet',
  [AccountType.PIWT]: 'Pi Wallet',
  [AccountType.NSVR]: 'Nostro/Vostro Account',
};

export type AccountStatusLabel = {
  [key in AccountStatus]: string;
};

export const ACCOUNT_STATUS_LABELS: AccountStatusLabel = {
  [AccountStatus.ACTIVE]: 'Active',
  [AccountStatus.DORMANT]: 'Dormant',
  [AccountStatus.CLOSED]: 'Closed',
  [AccountStatus.FROZEN]: 'Frozen',
  [AccountStatus.PENDING]: 'Pending',
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: 'green',
  [AccountStatus.DORMANT]: 'yellow',
  [AccountStatus.CLOSED]: 'gray',
  [AccountStatus.FROZEN]: 'red',
  [AccountStatus.PENDING]: 'blue',
};

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CHF',
  'JPY',
  'CNY',
  'AED',
  'SGD',
  'HKD',
  'CAD',
  'AUD',
  'NZD',
  'BTC',
  'ETH',
  'USDT',
  'PI',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
