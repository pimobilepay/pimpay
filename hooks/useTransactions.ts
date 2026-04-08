import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'on_hold';

export type TransactionType =
  | 'transfer'
  | 'payment'
  | 'deposit'
  | 'withdrawal'
  | 'refund'
  | 'fee';

export type SortField = 'date' | 'amount' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface TransactionFilters {
  status?: TransactionStatus | TransactionStatus[];
  type?: TransactionType | TransactionType[];
  dateRange?: { from: string; to: string };
  search?: string;
  currency?: string;
  amountMin?: number;
  amountMax?: number;
  sortBy?: SortField;
  sortDirection?: SortDirection;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StatusHistoryEntry {
  status: TransactionStatus;
  timestamp: string;
  actor?: string;
  note?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description?: string;
  senderAccount?: string;
  receiverAccount?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: StatusHistoryEntry[];
  metadata?: Record<string, unknown>;
  isStp?: boolean;
}

export interface TransactionStats {
  totalVolume: number;
  totalCount: number;
  countByStatus: Record<TransactionStatus, number>;
  stpRate: number;
  averageAmount: number;
  currencyBreakdown: Record<string, number>;
}

export interface TransactionsResponse {
  data: Transaction[];
  pagination: Pagination;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  currency: string;
  senderAccount: string;
  receiverAccount: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  transactionIds: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: TransactionFilters,
  pagination: Pick<Pagination, 'page' | 'pageSize'>
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: pagination.page,
    pageSize: pagination.pageSize,
  };

  if (filters.status) {
    params['status'] = Array.isArray(filters.status)
      ? filters.status.join(',')
      : filters.status;
  }
  if (filters.type) {
    params['type'] = Array.isArray(filters.type)
      ? filters.type.join(',')
      : filters.type;
  }
  if (filters.dateRange?.from) params['dateFrom'] = filters.dateRange.from;
  if (filters.dateRange?.to) params['dateTo'] = filters.dateRange.to;
  if (filters.search) params['search'] = filters.search;
  if (filters.currency) params['currency'] = filters.currency;
  if (filters.amountMin !== undefined) params['amountMin'] = filters.amountMin;
  if (filters.amountMax !== undefined) params['amountMax'] = filters.amountMax;
  if (filters.sortBy) params['sortBy'] = filters.sortBy;
  if (filters.sortDirection) params['sortDirection'] = filters.sortDirection;

  return params;
}

function computeStats(transactions: Transaction[]): TransactionStats {
  const allStatuses: TransactionStatus[] = [
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'on_hold',
  ];

  const countByStatus = allStatuses.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<TransactionStatus, number>
  );

  let totalVolume = 0;
  let stpCount = 0;
  const currencyBreakdown: Record<string, number> = {};

  for (const tx of transactions) {
    totalVolume += tx.amount;
    countByStatus[tx.status] = (countByStatus[tx.status] ?? 0) + 1;
    if (tx.isStp) stpCount++;
    currencyBreakdown[tx.currency] =
      (currencyBreakdown[tx.currency] ?? 0) + tx.amount;
  }

  return {
    totalVolume,
    totalCount: transactions.length,
    countByStatus,
    stpRate: transactions.length > 0 ? stpCount / transactions.length : 0,
    averageAmount:
      transactions.length > 0 ? totalVolume / transactions.length : 0,
    currencyBreakdown,
  };
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ─── useTransactions ─────────────────────────────────────────────────────────

export function useTransactions(initialFilters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersRaw] = useState<TransactionFilters>(initialFilters);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounce the search field only
  const debouncedSearch = useDebounce(filters.search ?? '', 400);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.status,
      filters.type,
      filters.dateRange,
      filters.currency,
      filters.amountMin,
      filters.amountMax,
      filters.sortBy,
      filters.sortDirection,
      debouncedSearch,
    ]
  );

  const fetchTransactions = useCallback(
    async (page = pagination.page, pageSize = pagination.pageSize) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = buildQueryParams(effectiveFilters, { page, pageSize });
        const response = await apiClient.get<TransactionsResponse>(
          '/transactions',
          { params, signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setTransactions(response.data.data);
          setPagination(response.data.pagination);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(
          err instanceof Error ? err : new Error('Failed to fetch transactions')
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveFilters]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [effectiveFilters]);

  // Fetch on filter/page change
  useEffect(() => {
    fetchTransactions(pagination.page, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilters, pagination.page, pagination.pageSize]);

  // Auto-refresh every 30 s
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      fetchTransactions(pagination.page, pagination.pageSize);
    }, 30_000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilters, pagination.page, pagination.pageSize]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    },
    []
  );

  const setFilters = useCallback(
    (update: TransactionFilters | ((prev: TransactionFilters) => TransactionFilters)) => {
      setFiltersRaw(update);
    },
    []
  );

  const refetch = useCallback(
    () => fetchTransactions(pagination.page, pagination.pageSize),
    [fetchTransactions, pagination.page, pagination.pageSize]
  );

  const stats = useMemo(() => computeStats(transactions), [transactions]);

  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  return {
    transactions,
    loading,
    error,
    filters,
    setFilters,
    pagination: { ...pagination, goToPage, setPageSize },
    refetch,
    stats,
  };
}

// ─── useTransaction (single) ─────────────────────────────────────────────────

export interface TransactionDetail extends Transaction {
  statusHistory: StatusHistoryEntry[];
  relatedTransactions?: Transaction[];
  auditLog?: Array<{ action: string; actor: string; timestamp: string }>;
}

export function useTransaction(id: string | null | undefined) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<TransactionDetail>(
        `/transactions/${encodeURIComponent(id)}`
      );
      setTransaction(response.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch transaction')
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return { transaction, loading, error, refetch: fetchTransaction };
}

// ─── useTransactionMutations ─────────────────────────────────────────────────

interface MutationState {
  loading: boolean;
  error: Error | null;
}

interface ApproveRejectPayload {
  note?: string;
}

type MutationKey = 'create' | 'approve' | 'reject' | 'bulkUpload';

export function useTransactionMutations() {
  const [states, setStates] = useState<Record<MutationKey, MutationState>>({
    create: { loading: false, error: null },
    approve: { loading: false, error: null },
    reject: { loading: false, error: null },
    bulkUpload: { loading: false, error: null },
  });

  const setMutationState = useCallback(
    (key: MutationKey, update: Partial<MutationState>) => {
      setStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...update },
      }));
    },
    []
  );

  const create = useCallback(
    async (payload: CreateTransactionPayload): Promise<Transaction | null> => {
      setMutationState('create', { loading: true, error: null });
      try {
        const response = await apiClient.post<Transaction>('/transactions', payload);
        setMutationState('create', { loading: false });
        return response.data;
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error('Failed to create transaction');
        setMutationState('create', { loading: false, error });
        return null;
      }
    },
    [setMutationState]
  );

  const approve = useCallback(
    async (
      id: string,
      payload: ApproveRejectPayload = {}
    ): Promise<Transaction | null> => {
      setMutationState('approve', { loading: true, error: null });
      try {
        const response = await apiClient.post<Transaction>(
          `/transactions/${encodeURIComponent(id)}/approve`,
          payload
        );
        setMutationState('approve', { loading: false });
        return response.data;
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error('Failed to approve transaction');
        setMutationState('approve', { loading: false, error });
        return null;
      }
    },
    [setMutationState]
  );

  const reject = useCallback(
    async (
      id: string,
      payload: ApproveRejectPayload = {}
    ): Promise<Transaction | null> => {
      setMutationState('reject', { loading: true, error: null });
      try {
        const response = await apiClient.post<Transaction>(
          `/transactions/${encodeURIComponent(id)}/reject`,
          payload
        );
        setMutationState('reject', { loading: false });
        return response.data;
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error('Failed to reject transaction');
        setMutationState('reject', { loading: false, error });
        return null;
      }
    },
    [setMutationState]
  );

  const bulkUpload = useCallback(
    async (file: File): Promise<BulkUploadResult | null> => {
      setMutationState('bulkUpload', { loading: true, error: null });
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<BulkUploadResult>(
          '/transactions/bulk-upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setMutationState('bulkUpload', { loading: false });
        return response.data;
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error('Failed to bulk upload transactions');
        setMutationState('bulkUpload', { loading: false, error });
        return null;
      }
    },
    [setMutationState]
  );

  return {
    create,
    approve,
    reject,
    bulkUpload,
    createState: states.create,
    approveState: states.approve,
    rejectState: states.reject,
    bulkUploadState: states.bulkUpload,
    isAnyLoading: Object.values(states).some((s) => s.loading),
  };
}
