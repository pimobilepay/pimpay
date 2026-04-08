/**
 * PIMPAY Banking Portal - Transaction Types
 * ISO 20022 compliant transaction type definitions
 */

// ─── ISO 20022 Message Types ─────────────────────────────────────────────────

export enum ISO20022MessageType {
  /** Customer Credit Transfer Initiation */
  PACS_008 = "pacs.008",
  /** Financial Institution To Financial Institution Payment Status Report */
  PACS_002 = "pacs.002",
  /** Payment Return */
  PACS_004 = "pacs.004",
  /** Financial Institution Credit Transfer */
  PACS_009 = "pacs.009",
  /** Customer Credit Transfer Initiation (Pain) */
  PAIN_001 = "pain.001",
  /** Customer Payment Status Report */
  PAIN_002 = "pain.002",
  /** Bank To Customer Account Report */
  CAMT_052 = "camt.052",
  /** Bank To Customer Statement */
  CAMT_053 = "camt.053",
  /** Bank To Customer Debit Credit Notification */
  CAMT_054 = "camt.054",
}

// ─── Transaction Status ───────────────────────────────────────────────────────

export enum TransactionStatus {
  /** Message received and acknowledged */
  RECEIVED = "RECEIVED",
  /** Message passed validation checks */
  VALIDATED = "VALIDATED",
  /** Payment is being processed */
  PROCESSING = "PROCESSING",
  /** Payment has been settled */
  SETTLED = "SETTLED",
  /** Payment has been rejected */
  REJECTED = "REJECTED",
  /** Payment has been returned */
  RETURNED = "RETURNED",
  /** Awaiting authorization / manual review */
  PENDING_AUTH = "PENDING_AUTH",
}

// ─── Payment Type ─────────────────────────────────────────────────────────────

export enum PaymentType {
  /** Standard credit transfer between accounts */
  CREDIT_TRANSFER = "CREDIT_TRANSFER",
  /** Return of a previously sent payment */
  RETURN = "RETURN",
  /** Financial institution to financial institution transfer */
  FI_TRANSFER = "FI_TRANSFER",
  /** Direct debit collection */
  DIRECT_DEBIT = "DIRECT_DEBIT",
}

// ─── Transaction Priority ─────────────────────────────────────────────────────

export enum TransactionPriority {
  /** Urgent / same-day settlement required */
  HIGH = "HIGH",
  /** Standard processing priority */
  NORMAL = "NORMAL",
  /** Deferred or batch processing */
  LOW = "LOW",
}

// ─── Core Transaction Interface ───────────────────────────────────────────────

export interface Transaction {
  /** Internal primary key (UUID v4) */
  id: string;

  /** Unique ISO 20022 message identifier (max 35 chars) */
  messageId: string;

  /** ISO 20022 message type that carried this transaction */
  messageType: ISO20022MessageType;

  /**
   * Transaction Identification – unique reference assigned by the
   * instructing party within the message (max 35 chars)
   */
  txIdIso: string;

  /**
   * Instruction Identification – point-to-point reference assigned
   * by the instructing party (max 35 chars)
   */
  instrId: string;

  /**
   * End-to-End Identification – unique reference assigned by the
   * initiating party, preserved throughout the payment chain (max 35 chars)
   */
  endToEndId: string;

  /**
   * Unique End-to-End Transaction Reference (UETR) –
   * UUID v4 per gpi / ISO 20022 tracking specification
   */
  uetr: string;

  /** Category of the payment */
  paymentType: PaymentType;

  /** Processing priority */
  priority: TransactionPriority;

  // ── Debtor (Payer) ──────────────────────────────────────────────────────────

  /** Full legal name of the debtor */
  debtorName: string;

  /**
   * Debtor account identifier.
   * Typically IBAN (max 34 chars) or proprietary account number.
   */
  debtorAccount: string;

  /**
   * BIC / SWIFT code of the debtor's financial institution (8 or 11 chars).
   */
  debtorAgent: string;

  // ── Creditor (Payee) ────────────────────────────────────────────────────────

  /** Full legal name of the creditor */
  creditorName: string;

  /**
   * Creditor account identifier.
   * Typically IBAN (max 34 chars) or proprietary account number.
   */
  creditorAccount: string;

  /**
   * BIC / SWIFT code of the creditor's financial institution (8 or 11 chars).
   */
  creditorAgent: string;

  // ── Amounts ─────────────────────────────────────────────────────────────────

  /** Original instructed amount (numeric string to preserve precision) */
  instructedAmount: string;

  /** ISO 4217 currency code of the instructed amount (e.g. "EUR") */
  instructedCurrency: string;

  /**
   * Actual settled amount; may differ from instructed when FX is applied.
   * Null until settlement.
   */
  settledAmount: string | null;

  /** ISO 4217 currency code of the settled amount */
  settledCurrency: string | null;

  /**
   * Total charges deducted / levied on this payment.
   * Null if no charges apply.
   */
  chargesAmount: string | null;

  /**
   * Applied exchange rate (instructed currency / settlement currency).
   * Null for same-currency transactions.
   */
  exchangeRate: string | null;

  // ── Dates ───────────────────────────────────────────────────────────────────

  /** Requested / actual settlement date (ISO 8601 date string, YYYY-MM-DD) */
  settlementDate: string | null;

  // ── Reference & Narrative ───────────────────────────────────────────────────

  /**
   * Remittance information / payment reference forwarded to the creditor.
   * Free text up to 140 chars (structured or unstructured).
   */
  remittanceInfo: string | null;

  // ── Processing Flags ────────────────────────────────────────────────────────

  /** Current lifecycle status of the transaction */
  status: TransactionStatus;

  /**
   * Straight-Through Processing flag.
   * true  → processed without manual intervention
   * false → required exception / manual handling
   */
  stp: boolean;

  // ── Audit Timestamps ────────────────────────────────────────────────────────

  /** ISO 8601 datetime when the record was first created */
  createdAt: string;

  /** ISO 8601 datetime of the most recent update */
  updatedAt: string;
}

// ─── Transaction Status History ───────────────────────────────────────────────

export interface TransactionStatusHistory {
  /** Primary key of the history record */
  id: string;

  /** Foreign key reference to the parent Transaction */
  transactionId: string;

  /** Status value at the time of this history entry */
  status: TransactionStatus;

  /** ISO 20022 rejection/return reason code (e.g. "AC01", "FF01") */
  reasonCode: string | null;

  /** Human-readable description of the status change */
  reasonDescription: string | null;

  /** System or user that triggered the status change */
  changedBy: string | null;

  /** ISO 8601 datetime when this status was recorded */
  timestamp: string;

  /** Optional additional metadata stored as key-value pairs */
  metadata: Record<string, unknown> | null;
}

// ─── Transaction Filters ──────────────────────────────────────────────────────

export interface DateRange {
  /** ISO 8601 date or datetime string for the start of the range (inclusive) */
  from: string;
  /** ISO 8601 date or datetime string for the end of the range (inclusive) */
  to: string;
}

export interface TransactionFilters {
  /** Filter by creation / value date range */
  dateRange?: DateRange;

  /** Filter by one or more statuses */
  status?: TransactionStatus[];

  /** Filter by one or more payment types */
  type?: PaymentType[];

  /** Filter by one or more ISO 20022 message types */
  messageType?: ISO20022MessageType[];

  /** Filter by one or more priorities */
  priority?: TransactionPriority[];

  /** Minimum instructed/settled amount (inclusive) */
  amountMin?: number;

  /** Maximum instructed/settled amount (inclusive) */
  amountMax?: number;

  /** ISO 4217 currency code to filter on (e.g. "EUR", "USD") */
  currency?: string;

  /**
   * Free-text search query.
   * Applied against: messageId, txIdIso, endToEndId, uetr,
   * debtorName, creditorName, remittanceInfo
   */
  searchQuery?: string;

  /**
   * BIC / SWIFT code of the debtor or creditor agent to filter on.
   * Matches debtorAgent OR creditorAgent.
   */
  agentBic?: string;

  /** Filter for STP / non-STP transactions */
  stp?: boolean;

  /** Filter by settlement date range */
  settlementDateRange?: DateRange;
}

// ─── Transaction Statistics ───────────────────────────────────────────────────

export interface TransactionCountsByStatus {
  [TransactionStatus.RECEIVED]: number;
  [TransactionStatus.VALIDATED]: number;
  [TransactionStatus.PROCESSING]: number;
  [TransactionStatus.SETTLED]: number;
  [TransactionStatus.REJECTED]: number;
  [TransactionStatus.RETURNED]: number;
  [TransactionStatus.PENDING_AUTH]: number;
}

export interface TransactionVolumeByDate {
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string;
  /** Total number of transactions on that date */
  count: number;
  /** Summed instructed amount on that date */
  totalAmount: string;
  /** ISO 4217 currency code for the summed amount */
  currency: string;
}

export interface TransactionStats {
  /** Breakdown of transaction counts grouped by status */
  countsByStatus: TransactionCountsByStatus;

  /** Total number of transactions matching the current filter context */
  totalCount: number;

  /**
   * Aggregate instructed/settled volume (numeric string).
   * Currency is indicated by `volumeCurrency`.
   */
  totalVolume: string;

  /** ISO 4217 currency code for `totalVolume` */
  volumeCurrency: string;

  /** Mean transaction amount (numeric string) */
  averageAmount: string;

  /**
   * Straight-Through Processing rate expressed as a percentage (0–100).
   * e.g. 98.7 means 98.7 % of transactions were processed without
   * manual intervention.
   */
  stpRate: number;

  /** Number of transactions processed without manual intervention */
  stpCount: number;

  /** Number of transactions that required manual handling */
  nonStpCount: number;

  /** Daily volume breakdown for charting (ordered ascending by date) */
  volumeByDate: TransactionVolumeByDate[];

  /** ISO 8601 datetime when these statistics were computed */
  computedAt: string;
}

// ─── Bulk Upload ──────────────────────────────────────────────────────────────

export interface BulkUploadRowError {
  /** 1-based row number in the uploaded file */
  rowNumber: number;

  /** Field name that caused the validation failure (if applicable) */
  field: string | null;

  /** Human-readable error message */
  message: string;

  /** ISO 20022 error code (if applicable) */
  code: string | null;
}

export interface BulkUploadResult {
  /** Unique identifier for this upload batch */
  batchId: string;

  /** Original filename as provided by the uploader */
  fileName: string;

  /** Detected ISO 20022 message type of the uploaded file */
  messageType: ISO20022MessageType | null;

  /** Total number of rows / transactions parsed from the file */
  totalRows: number;

  /** Number of rows successfully validated and accepted */
  acceptedCount: number;

  /** Number of rows that failed validation */
  rejectedCount: number;

  /** IDs of transactions successfully created from this batch */
  createdTransactionIds: string[];

  /** Detailed per-row errors for rejected entries */
  errors: BulkUploadRowError[];

  /** Whether every row in the file was accepted without error */
  fullySuccessful: boolean;

  /** ISO 8601 datetime when the upload was processed */
  processedAt: string;

  /** System user or API key that initiated the upload */
  uploadedBy: string | null;
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;

  /** Number of items per page */
  pageSize: number;

  /** Total number of items across all pages */
  totalItems: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there is a page after the current one */
  hasNextPage: boolean;

  /** Whether there is a page before the current one */
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];

  /** Pagination metadata */
  pagination: PaginationMeta;

  /** ISO 8601 datetime when this response was generated */
  generatedAt: string;
}

// ─── Convenience Type Aliases ─────────────────────────────────────────────────

/** A paginated list of transactions */
export type PaginatedTransactions = PaginatedResponse<Transaction>;

/** A paginated list of status history entries */
export type PaginatedStatusHistory = PaginatedResponse<TransactionStatusHistory>;

/** Partial transaction used for update operations */
export type TransactionUpdatePayload = Partial<
  Omit<Transaction, "id" | "createdAt" | "updatedAt">
>;

/** Shape expected when creating a new transaction programmatically */
export type TransactionCreatePayload = Omit<
  Transaction,
  "id" | "status" | "stp" | "settledAmount" | "settledCurrency" | "settlementDate" | "chargesAmount" | "exchangeRate" | "createdAt" | "updatedAt"
> & {
  /** Initial status override; defaults to RECEIVED if omitted */
  status?: TransactionStatus;
};
