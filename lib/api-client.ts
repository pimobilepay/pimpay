import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://pimpay.vercel.app/api';
const TOKEN_KEY = 'pimpay_access_token';
const REFRESH_TOKEN_KEY = 'pimpay_refresh_token';
const IS_DEV = process.env.NODE_ENV === 'development';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: number;
  success: boolean;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  status: number;
}

// ─── Filter / Param Types ─────────────────────────────────────────────────────

export interface TransactionFilters {
  accountId?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'completed' | 'failed' | 'rejected';
  type?: 'credit' | 'debit' | 'transfer';
}

export interface AccountFilters {
  currency?: string;
  page?: number;
  pageSize?: number;
  status?: 'active' | 'inactive' | 'suspended';
  type?: 'savings' | 'current' | 'nostro' | 'vostro';
}

export interface ComplianceAlertFilters {
  page?: number;
  pageSize?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  type?: string;
}

export interface DateRange {
  from: string;
  to: string;
}

// ─── Domain Model Types ───────────────────────────────────────────────────────

export interface Transaction {
  accountId: string;
  amount: number;
  createdAt: string;
  currency: string;
  description: string;
  id: string;
  metadata?: Record<string, unknown>;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  type: 'credit' | 'debit' | 'transfer';
  updatedAt: string;
}

export interface CreateTransactionPayload {
  accountId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
  reference?: string;
  toAccountId?: string;
  type: 'credit' | 'debit' | 'transfer';
}

export interface BulkUploadResult {
  errors: Array<{ line: number; message: string }>;
  failed: number;
  jobId: string;
  processed: number;
  total: number;
}

export interface Account {
  balance: number;
  createdAt: string;
  currency: string;
  id: string;
  iban?: string;
  name: string;
  number: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'suspended';
  type: 'savings' | 'current' | 'nostro' | 'vostro';
  updatedAt: string;
}

export interface AccountBalance {
  accountId: string;
  available: number;
  currency: string;
  frozen: number;
  lastUpdated: string;
  ledger: number;
  pending: number;
}

export interface AccountStatement {
  accountId: string;
  closingBalance: number;
  currency: string;
  dateRange: DateRange;
  generatedAt: string;
  openingBalance: number;
  transactions: Transaction[];
}

export interface ComplianceAlert {
  accountId: string;
  assignedTo?: string;
  createdAt: string;
  description: string;
  id: string;
  resolved: boolean;
  resolvedAt?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  transactionId?: string;
  type: string;
}

export interface SanctionScreeningResult {
  matchScore: number;
  matches: Array<{
    alias?: string[];
    dateOfBirth?: string;
    listName: string;
    matchedName: string;
    nationality?: string;
    sanctionType: string;
  }>;
  name: string;
  screened: boolean;
  screenedAt: string;
}

export interface STRPayload {
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  submittedBy: string;
  transactionIds: string[];
}

export interface STRResponse {
  filedAt: string;
  id: string;
  referenceNumber: string;
  status: 'submitted' | 'under_review' | 'closed';
}

export interface AMLRule {
  conditions: Record<string, unknown>;
  enabled: boolean;
  id: string;
  name: string;
  riskScore: number;
  type: string;
}

export interface User {
  createdAt: string;
  department?: string;
  disabled: boolean;
  email: string;
  id: string;
  lastLogin?: string;
  name: string;
  permissions: string[];
  role: UserRole;
  updatedAt: string;
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'compliance_officer'
  | 'treasury_manager'
  | 'analyst'
  | 'viewer';

export interface CreateUserPayload {
  department?: string;
  email: string;
  name: string;
  permissions?: string[];
  role: UserRole;
}

export interface TreasuryOverview {
  cashPosition: number;
  currency: string;
  lastUpdated: string;
  liquidity: Record<string, number>;
  totalAssets: number;
  totalLiabilities: number;
}

export interface NostroVostroPosition {
  accounts: Array<{
    accountId: string;
    balance: number;
    bank: string;
    currency: string;
    lastReconciled: string;
    type: 'nostro' | 'vostro';
  }>;
  totalNostro: number;
  totalVostro: number;
}

export interface SweepRule {
  active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  id: string;
  name: string;
  sourceAccountId: string;
  targetAccountId: string;
  threshold: number;
  type: 'zero_balance' | 'target_balance' | 'threshold';
}

export interface FXRate {
  askRate: number;
  baseCurrency: string;
  bidRate: number;
  midRate: number;
  quoteCurrency: string;
  timestamp: string;
}

export interface Webhook {
  createdAt: string;
  events: string[];
  id: string;
  secret?: string;
  status: 'active' | 'inactive';
  updatedAt: string;
  url: string;
}

export interface CreateWebhookPayload {
  events: string[];
  url: string;
}

export interface WebhookTestResult {
  deliveredAt?: string;
  error?: string;
  responseCode?: number;
  responseTime?: number;
  success: boolean;
  webhookId: string;
}

export interface ReportGenerationParams {
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
  format?: 'pdf' | 'csv' | 'xlsx';
}

export type ReportType =
  | 'transaction_summary'
  | 'account_statement'
  | 'compliance_report'
  | 'aml_report'
  | 'str_report'
  | 'treasury_report'
  | 'fx_report';

export interface ReportJob {
  completedAt?: string;
  createdAt: string;
  downloadUrl?: string;
  format: 'pdf' | 'csv' | 'xlsx';
  id: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  type: ReportType;
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setTokens = (accessToken: string, refreshToken?: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = {
  request: (config: InternalAxiosRequestConfig): void => {
    if (!IS_DEV) return;
    console.group(`%c[PIMPAY API] → ${config.method?.toUpperCase()} ${config.url}`, 'color: #4f46e5; font-weight: bold');
    if (config.params) console.log('Params:', config.params);
    if (config.data) console.log('Body:', config.data);
    console.groupEnd();
  },
  response: (response: AxiosResponse): void => {
    if (!IS_DEV) return;
    const duration = response.config.metadata?.duration ?? 'N/A';
    console.group(
      `%c[PIMPAY API] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
      'color: #16a34a; font-weight: bold'
    );
    console.log('Data:', response.data);
    console.groupEnd();
  },
  error: (error: unknown): void => {
    if (!IS_DEV) return;
    console.group('%c[PIMPAY API] ✕ Error', 'color: #dc2626; font-weight: bold');
    console.error(error);
    console.groupEnd();
  },
};

// Augment AxiosRequestConfig to support metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime?: number; duration?: number };
    _retry?: boolean;
  }
}

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'pimpay-portal/1.0',
  },
  timeout: 30_000,
});

// ─── Refresh Token Logic ──────────────────────────────────────────────────────

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

const processQueue = (token: string): void => {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await axios.post<{ accessToken: string; refreshToken?: string }>(
    `${BASE_URL}/auth/refresh`,
    { refreshToken }
  );

  const { accessToken, refreshToken: newRefreshToken } = response.data;
  setTokens(accessToken, newRefreshToken);
  return accessToken;
};

// ─── Request Interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach bearer token
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach request start time for logging
    config.metadata = { startTime: Date.now() };

    logger.request(config);
    return config;
  },
  (error) => {
    logger.error(error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Calculate request duration
    if (response.config.metadata?.startTime) {
      response.config.metadata.duration = Date.now() - response.config.metadata.startTime;
    }

    logger.response(response);

    // Unwrap envelope if present
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response;
    }

    return response;
  },
  async (error) => {
    logger.error(error);

    const originalRequest = error.config as InternalAxiosRequestConfig;

    // Handle 401 – attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
          void reject;
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        isRefreshing = false;
        pendingRequests = [];
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pimpay:session-expired'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalise error shape
    const apiError: ApiError = {
      code: error.response?.data?.code ?? 'UNKNOWN_ERROR',
      details: error.response?.data?.details,
      message:
        error.response?.data?.message ??
        error.message ??
        'An unexpected error occurred',
      status: error.response?.status ?? 0,
    };

    return Promise.reject(apiError);
  }
);

// ─── Generic HTTP Methods ─────────────────────────────────────────────────────

export const get = <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<T>>> =>
  apiClient.get<ApiResponse<T>>(url, config);

export const post = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<T>>> =>
  apiClient.post<ApiResponse<T>>(url, data, config);

export const put = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<T>>> =>
  apiClient.put<ApiResponse<T>>(url, data, config);

export const patch = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<T>>> =>
  apiClient.patch<ApiResponse<T>>(url, data, config);

export const del = <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<T>>> =>
  apiClient.delete<ApiResponse<T>>(url, config);

// ─── Helper: Extract Data ─────────────────────────────────────────────────────

const extract = <T>(response: AxiosResponse<ApiResponse<T>>): T =>
  response.data.data;

// ─── Transactions API ─────────────────────────────────────────────────────────

export const transactionsApi = {
  /**
   * List transactions with optional filters.
   */
  list: async (filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> => {
    const response = await get<PaginatedResponse<Transaction>>('/transactions', {
      params: filters,
    });
    return extract(response);
  },

  /**
   * Get a single transaction by ID.
   */
  getById: async (id: string): Promise<Transaction> => {
    const response = await get<Transaction>(`/transactions/${id}`);
    return extract(response);
  },

  /**
   * Create a new transaction.
   */
  create: async (data: CreateTransactionPayload): Promise<Transaction> => {
    const response = await post<Transaction, CreateTransactionPayload>('/transactions', data);
    return extract(response);
  },

  /**
   * Approve a pending transaction.
   */
  approve: async (id: string): Promise<Transaction> => {
    const response = await post<Transaction>(`/transactions/${id}/approve`);
    return extract(response);
  },

  /**
   * Reject a pending transaction with a reason.
   */
  reject: async (id: string, reason: string): Promise<Transaction> => {
    const response = await post<Transaction, { reason: string }>(
      `/transactions/${id}/reject`,
      { reason }
    );
    return extract(response);
  },

  /**
   * Bulk upload transactions via CSV/XLSX file.
   */
  bulkUpload: async (file: File): Promise<BulkUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await post<BulkUploadResult, FormData>(
      '/transactions/bulk-upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return extract(response);
  },
};

// ─── Accounts API ─────────────────────────────────────────────────────────────

export const accountsApi = {
  /**
   * List accounts with optional filters.
   */
  list: async (filters?: AccountFilters): Promise<PaginatedResponse<Account>> => {
    const response = await get<PaginatedResponse<Account>>('/accounts', {
      params: filters,
    });
    return extract(response);
  },

  /**
   * Get a single account by ID.
   */
  getById: async (id: string): Promise<Account> => {
    const response = await get<Account>(`/accounts/${id}`);
    return extract(response);
  },

  /**
   * Get balance details for an account.
   */
  getBalance: async (id: string): Promise<AccountBalance> => {
    const response = await get<AccountBalance>(`/accounts/${id}/balance`);
    return extract(response);
  },

  /**
   * Get account statement for a given date range.
   */
  getStatement: async (id: string, dateRange: DateRange): Promise<AccountStatement> => {
    const response = await get<AccountStatement>(`/accounts/${id}/statement`, {
      params: { from: dateRange.from, to: dateRange.to },
    });
    return extract(response);
  },
};

// ─── Compliance API ───────────────────────────────────────────────────────────

export const complianceApi = {
  /**
   * Get compliance / AML alerts with optional filters.
   */
  getAlerts: async (filters?: ComplianceAlertFilters): Promise<PaginatedResponse<ComplianceAlert>> => {
    const response = await get<PaginatedResponse<ComplianceAlert>>('/compliance/alerts', {
      params: filters,
    });
    return extract(response);
  },

  /**
   * Screen a name against international sanctions lists.
   */
  screenSanctions: async (name: string): Promise<SanctionScreeningResult> => {
    const response = await post<SanctionScreeningResult, { name: string }>(
      '/compliance/sanctions/screen',
      { name }
    );
    return extract(response);
  },

  /**
   * File a Suspicious Transaction Report (STR).
   */
  fileSTR: async (data: STRPayload): Promise<STRResponse> => {
    const response = await post<STRResponse, STRPayload>('/compliance/str', data);
    return extract(response);
  },

  /**
   * Get configured AML rules.
   */
  getAMLRules: async (): Promise<AMLRule[]> => {
    const response = await get<AMLRule[]>('/compliance/aml-rules');
    return extract(response);
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * List all users.
   */
  list: async (): Promise<User[]> => {
    const response = await get<User[]>('/users');
    return extract(response);
  },

  /**
   * Get a user by ID.
   */
  getById: async (id: string): Promise<User> => {
    const response = await get<User>(`/users/${id}`);
    return extract(response);
  },

  /**
   * Create a new portal user.
   */
  create: async (data: CreateUserPayload): Promise<User> => {
    const response = await post<User, CreateUserPayload>('/users', data);
    return extract(response);
  },

  /**
   * Update the role of an existing user.
   */
  updateRole: async (id: string, role: UserRole): Promise<User> => {
    const response = await patch<User, { role: UserRole }>(`/users/${id}/role`, { role });
    return extract(response);
  },

  /**
   * Disable a user account.
   */
  disable: async (id: string): Promise<User> => {
    const response = await post<User>(`/users/${id}/disable`);
    return extract(response);
  },
};

// ─── Treasury API ─────────────────────────────────────────────────────────────

export const treasuryApi = {
  /**
   * Get treasury overview / cash position.
   */
  getOverview: async (): Promise<TreasuryOverview> => {
    const response = await get<TreasuryOverview>('/treasury/overview');
    return extract(response);
  },

  /**
   * Get Nostro / Vostro account positions.
   */
  getNostroVostro: async (): Promise<NostroVostroPosition> => {
    const response = await get<NostroVostroPosition>('/treasury/nostro-vostro');
    return extract(response);
  },

  /**
   * Get configured liquidity sweep rules.
   */
  getSweepRules: async (): Promise<SweepRule[]> => {
    const response = await get<SweepRule[]>('/treasury/sweep-rules');
    return extract(response);
  },

  /**
   * Get live FX rates for CEMAC zone and major currencies.
   */
  getFXRates: async (): Promise<FXRate[]> => {
    const response = await get<FXRate[]>('/treasury/fx-rates');
    return extract(response);
  },
};

// ─── Webhooks API ─────────────────────────────────────────────────────────────

export const webhooksApi = {
  /**
   * List all registered webhooks.
   */
  list: async (): Promise<Webhook[]> => {
    const response = await get<Webhook[]>('/webhooks');
    return extract(response);
  },

  /**
   * Register a new webhook endpoint.
   */
  create: async (data: CreateWebhookPayload): Promise<Webhook> => {
    const response = await post<Webhook, CreateWebhookPayload>('/webhooks', data);
    return extract(response);
  },

  /**
   * Send a test payload to a webhook.
   */
  test: async (id: string): Promise<WebhookTestResult> => {
    const response = await post<WebhookTestResult>(`/webhooks/${id}/test`);
    return extract(response);
  },

  /**
   * Delete / unregister a webhook.
   */
  delete: async (id: string): Promise<void> => {
    await del(`/webhooks/${id}`);
  },
};

// ─── Reports API ──────────────────────────────────────────────────────────────

export const reportsApi = {
  /**
   * Enqueue a report generation job.
   */
  generate: async (type: ReportType, params?: ReportGenerationParams): Promise<ReportJob> => {
    const response = await post<ReportJob, { type: ReportType } & ReportGenerationParams>(
      '/reports/generate',
      { type, ...params }
    );
    return extract(response);
  },

  /**
   * Download a completed report by job ID.
   * Returns the raw Blob for the caller to handle.
   */
  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ─── Default Export ───────────────────────────────────────────────────────────

export default apiClient;
