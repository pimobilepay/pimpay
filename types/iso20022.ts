// ─── PIMPAY ISO 20022 Types ───────────────────────────────────────────────────

export const XAF_EUR_RATE = 655.957;
export const BEAC_BIC = 'BEACBZBA';
export const SUPPORTED_CURRENCIES = ['XAF', 'XOF', 'EUR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CEMAC_COUNTRIES = {
  CG: 'Congo',
  CM: 'Cameroun',
  GA: 'Gabon',
  GQ: 'Guinée Équatoriale',
  CF: 'République Centrafricaine',
  TD: 'Tchad',
} as const;

// ─── Error Codes ──────────────────────────────────────────────────────────────

export enum ISO20022ErrorCode {
  AC01 = 'AC01', // IncorrectAccountNumber
  AC04 = 'AC04', // ClosedAccountNumber
  AC06 = 'AC06', // BlockedAccount
  AC13 = 'AC13', // InvalidDebtorAccountType
  AG01 = 'AG01', // TransactionForbidden
  AG02 = 'AG02', // InvalidBankOperationCode
  AM01 = 'AM01', // ZeroAmount
  AM02 = 'AM02', // NotAllowedAmount
  AM04 = 'AM04', // InsufficientFunds
  AM05 = 'AM05', // Duplication
  AM09 = 'AM09', // WrongAmount
  BE01 = 'BE01', // InconsistentWithEndCustomer
  BE04 = 'BE04', // MissingCreditorAddress
  DT01 = 'DT01', // InvalidDate
  FF01 = 'FF01', // InvalidFileFormat
  MD01 = 'MD01', // NoMandate
  RC01 = 'RC01', // BankIdentifierIncorrect
  TM01 = 'TM01', // CutOffTime
}

export const ERROR_DESCRIPTIONS: Record<ISO20022ErrorCode, string> = {
  [ISO20022ErrorCode.AC01]: 'Numéro de compte incorrect',
  [ISO20022ErrorCode.AC04]: 'Compte clôturé',
  [ISO20022ErrorCode.AC06]: 'Compte bloqué',
  [ISO20022ErrorCode.AC13]: 'Type de compte débiteur invalide',
  [ISO20022ErrorCode.AG01]: 'Transaction interdite',
  [ISO20022ErrorCode.AG02]: 'Code opération bancaire invalide',
  [ISO20022ErrorCode.AM01]: 'Montant nul',
  [ISO20022ErrorCode.AM02]: 'Montant non autorisé',
  [ISO20022ErrorCode.AM04]: 'Fonds insuffisants',
  [ISO20022ErrorCode.AM05]: 'Duplication',
  [ISO20022ErrorCode.AM09]: 'Montant incorrect',
  [ISO20022ErrorCode.BE01]: 'Incohérence avec le client final',
  [ISO20022ErrorCode.BE04]: 'Adresse créancier manquante',
  [ISO20022ErrorCode.DT01]: 'Date invalide',
  [ISO20022ErrorCode.FF01]: 'Format de fichier invalide',
  [ISO20022ErrorCode.MD01]: 'Pas de mandat',
  [ISO20022ErrorCode.RC01]: 'Identifiant bancaire incorrect',
  [ISO20022ErrorCode.TM01]: 'Heure limite dépassée',
};

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageType =
  | 'pacs.008'
  | 'pacs.002'
  | 'pacs.004'
  | 'pacs.009'
  | 'pain.001'
  | 'pain.002'
  | 'camt.052'
  | 'camt.053'
  | 'camt.054';

export type MessageStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'REJECTED'
  | 'RETURNED'
  | 'PENDING_AUTH';

export type ChargeBearer = 'DEBT' | 'CRED' | 'SHAR' | 'SLEV';

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface ISO20022Message {
  id: string;
  messageType: MessageType;
  businessMessageId: string;
  creationDateTime: string;
  senderBIC: string;
  receiverBIC: string;
  xmlPayload?: string;
  jsonPayload?: Record<string, unknown>;
  checksum: string;
  status: MessageStatus;
  processingLog?: ProcessingLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingLogEntry {
  timestamp: string;
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

export interface GroupHeader {
  msgId: string;
  creDtTm: string;
  nbOfTxs: number;
  ctrlSum?: number;
  totalInterbankSettlementAmount?: number;
  interbankSettlementDate?: string;
  settlementMethod: 'INDA' | 'INGA' | 'COVE' | 'CLRG';
  instructingAgent?: string;
  instructedAgent?: string;
}

export interface PartyInfo {
  name: string;
  postalAddress?: {
    streetName?: string;
    buildingNumber?: string;
    postCode?: string;
    townName?: string;
    country: string;
  };
  id?: {
    organisationId?: string;
    privateId?: string;
  };
  countryOfResidence?: string;
}

export interface AccountInfo {
  iban?: string;
  otherId?: string;
  currency: string;
  name?: string;
  type?: string;
}

export interface AgentInfo {
  bic: string;
  name?: string;
  branchId?: string;
  clearingSystemId?: string;
}

// ─── pacs.008 — FIToFICustomerCreditTransfer ──────────────────────────────────

export interface Pacs008Message {
  groupHeader: GroupHeader;
  creditTransferTransactions: Pacs008Transaction[];
}

export interface Pacs008Transaction {
  paymentId: {
    instructionId?: string;
    endToEndId: string;
    uetr: string;
    transactionId: string;
  };
  amount: number;
  currency: string;
  chargeBearer: ChargeBearer;
  debtor: PartyInfo;
  debtorAccount: AccountInfo;
  debtorAgent: AgentInfo;
  creditor: PartyInfo;
  creditorAccount: AccountInfo;
  creditorAgent: AgentInfo;
  intermediaryAgent1?: AgentInfo;
  purpose?: string;
  remittanceInfo?: {
    unstructured?: string;
    structured?: {
      creditorReferenceType?: string;
      creditorReference?: string;
    };
  };
  regulatoryReporting?: {
    authority: string;
    details: { type: string; code: string; amount?: number; information?: string }[];
  };
}

// ─── pacs.002 — FIToFIPaymentStatusReport ─────────────────────────────────────

export interface Pacs002Message {
  groupHeader: GroupHeader;
  originalGroupInformation: {
    originalMessageId: string;
    originalMessageType: MessageType;
    groupStatus?: string;
  };
  transactionStatuses: Pacs002Status[];
}

export interface Pacs002Status {
  originalEndToEndId: string;
  originalTransactionId: string;
  transactionStatus: 'ACCP' | 'ACSP' | 'ACSC' | 'ACWC' | 'RJCT' | 'PDNG' | 'ACTC';
  statusReasonCode?: ISO20022ErrorCode;
  statusReasonDescription?: string;
  additionalInfo?: string;
  acceptanceDateTime?: string;
  charges?: { amount: number; currency: string; agent: string }[];
}

// ─── pacs.004 — PaymentReturn ─────────────────────────────────────────────────

export interface Pacs004Message {
  groupHeader: GroupHeader;
  returns: Pacs004Return[];
}

export interface Pacs004Return {
  returnId: string;
  originalEndToEndId: string;
  originalTransactionId: string;
  returnedInterbankSettlementAmount: number;
  returnedInterbankSettlementCurrency: string;
  returnReasonCode: ISO20022ErrorCode;
  returnReasonDescription?: string;
  originalInstructingAgent?: string;
  originalInstructedAgent?: string;
}

// ─── pacs.009 — FinancialInstitutionCreditTransfer ────────────────────────────

export interface Pacs009Message {
  groupHeader: GroupHeader;
  creditTransfers: {
    paymentId: { instructionId: string; endToEndId: string; uetr: string };
    amount: number;
    currency: string;
    debtorAgent: AgentInfo;
    creditorAgent: AgentInfo;
    intermediaryAgent?: AgentInfo;
  }[];
}

// ─── pain.001 — CustomerCreditTransferInitiation ──────────────────────────────

export interface Pain001Message {
  groupHeader: {
    msgId: string;
    creDtTm: string;
    nbOfTxs: number;
    ctrlSum?: number;
    initiatingParty: PartyInfo;
  };
  paymentInformation: {
    paymentInfoId: string;
    paymentMethod: 'CHK' | 'TRF' | 'TRA';
    requestedExecutionDate: string;
    debtor: PartyInfo;
    debtorAccount: AccountInfo;
    debtorAgent: AgentInfo;
    creditTransfers: {
      endToEndId: string;
      amount: number;
      currency: string;
      creditor: PartyInfo;
      creditorAccount: AccountInfo;
      creditorAgent?: AgentInfo;
      remittanceInfo?: string;
    }[];
  }[];
}

// ─── pain.002 — CustomerPaymentStatusReport ───────────────────────────────────

export interface Pain002Message {
  groupHeader: GroupHeader;
  originalPaymentInfoAndStatus: {
    originalPaymentInfoId: string;
    paymentInfoStatus?: string;
    statusReasonCode?: ISO20022ErrorCode;
    transactionStatuses?: {
      originalEndToEndId: string;
      transactionStatus: string;
      statusReasonCode?: ISO20022ErrorCode;
    }[];
  }[];
}

// ─── camt.053 — BankToCustomerStatement ───────────────────────────────────────

export interface Camt053Message {
  groupHeader: { msgId: string; creDtTm: string; msgPagination?: { pageNumber: number; lastPageIndicator: boolean } };
  statements: Camt053Statement[];
}

export interface Camt053Statement {
  statementId: string;
  accountId: string;
  accountOwner?: string;
  fromDate: string;
  toDate: string;
  openingBalance: { amount: number; currency: string; creditDebit: 'CRDT' | 'DBIT'; date: string };
  closingBalance: { amount: number; currency: string; creditDebit: 'CRDT' | 'DBIT'; date: string };
  totalEntries?: { numberOfEntries: number; sum: number; totalNetAmount: number; creditDebitIndicator: 'CRDT' | 'DBIT' };
  entries: Camt053Entry[];
}

export interface Camt053Entry {
  entryReference: string;
  amount: number;
  currency: string;
  creditDebit: 'CRDT' | 'DBIT';
  status: 'BOOK' | 'PDNG' | 'INFO';
  bookingDate: string;
  valueDate: string;
  bankTransactionCode?: { domain: string; family: string; subFamily: string };
  remittanceInfo?: string;
  additionalEntryInfo?: string;
}

// ─── camt.052 — BankToCustomerReport ──────────────────────────────────────────

export interface Camt052Message {
  groupHeader: { msgId: string; creDtTm: string };
  reports: {
    reportId: string;
    accountId: string;
    fromDate: string;
    toDate: string;
    balance: { amount: number; currency: string; creditDebit: 'CRDT' | 'DBIT' }[];
    entries: Camt053Entry[];
  }[];
}

// ─── camt.054 — BankToCustomerDebitCreditNotification ─────────────────────────

export interface Camt054Message {
  groupHeader: { msgId: string; creDtTm: string };
  notifications: {
    notificationId: string;
    accountId: string;
    entries: Camt053Entry[];
  }[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface MessageValidationResult {
  isValid: boolean;
  messageType?: MessageType;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

// ─── CEMAC Regulatory ─────────────────────────────────────────────────────────

export interface COBACReport {
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  reportingPeriod: { from: string; to: string };
  reportingEntity: { name: string; bic: string; cobacId: string };
  data: Record<string, unknown>;
}

export interface BEACReserveReport {
  date: string;
  minimumReserveRequired: number;
  actualReserveHeld: number;
  complianceStatus: 'COMPLIANT' | 'DEFICIT' | 'EXCESS';
  currency: 'XAF';
}
