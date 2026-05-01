import { useState, useEffect, useCallback, useRef } from 'react';
import { PimpayWebSocketClient, type Channel, type ConnectionState } from '../lib/websocket-client';

interface WebSocketHookReturn<T = unknown> {
  data: T | null;
  isConnected: boolean;
  error: Error | null;
  send: (message: unknown) => void;
}

interface RealtimeStats {
  totalTransactions: number;
  volumeToday: number;
  activeUsers: number;
  pendingAlerts: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  avgResponseTime: number;
}

interface TransactionUpdate {
  id: string;
  type: 'credit' | 'debit' | 'transfer' | 'payment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  accountId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

function useWebSocket<T = unknown>(channel: Channel): WebSocketHookReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const managerRef = useRef<PimpayWebSocketClient | null>(null);
  const channelRef = useRef<Channel>(channel);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  useEffect(() => {
    mountedRef.current = true;

    let manager: PimpayWebSocketClient;

    const initialize = async () => {
      try {
        manager = PimpayWebSocketClient.getInstance();
        managerRef.current = manager;

        manager.on('stateChange', (state: ConnectionState) => {
          if (mountedRef.current) {
            setIsConnected(state === 'CONNECTED');
            if (state === 'CONNECTED') {
              setError(null);
            }
          }
        });

        manager.on('error', (err: unknown) => {
          if (mountedRef.current) {
            const errorObj =
              err instanceof Error
                ? err
                : new Error(
                    typeof err === 'string' ? err : 'WebSocket error occurred'
                  );
            setError(errorObj);
            setIsConnected(false);
          }
        });

        manager.on('reconnecting', () => {
          if (mountedRef.current) {
            setIsConnected(false);
          }
        });

        manager.on('reconnected', () => {
          if (mountedRef.current) {
            setIsConnected(true);
            setError(null);
          }
        });

        await manager.connect();

        manager.subscribe(channelRef.current, (message: unknown) => {
          if (mountedRef.current) {
            try {
              setData(message as T);
              setError(null);
            } catch (parseError) {
              const errorObj =
                parseError instanceof Error
                  ? parseError
                  : new Error('Failed to process message');
              setError(errorObj);
            }
          }
        });
      } catch (initError) {
        if (mountedRef.current) {
          const errorObj =
            initError instanceof Error
              ? initError
              : new Error('Failed to initialize WebSocket connection');
          setError(errorObj);
          setIsConnected(false);
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;

      if (managerRef.current) {
        try {
          managerRef.current.unsubscribe(channelRef.current);
          managerRef.current.disconnect();
        } catch (cleanupError) {
          console.warn(
            '[useWebSocket] Error during cleanup:',
            cleanupError
          );
        }
        managerRef.current = null;
      }

      setIsConnected(false);
      setData(null);
      setError(null);
    };
  }, [channel]);

  const send = useCallback((message: unknown): void => {
    if (!managerRef.current) {
      console.warn(
        '[useWebSocket] Cannot send message: WebSocket manager not initialized'
      );
      return;
    }

    if (!isConnected) {
      console.warn(
        '[useWebSocket] Cannot send message: WebSocket is not connected'
      );
      return;
    }

    try {
      managerRef.current.send({ channel: channelRef.current, ...(message as Record<string, unknown>) });
    } catch (sendError) {
      const errorObj =
        sendError instanceof Error
          ? sendError
          : new Error('Failed to send WebSocket message');
      setError(errorObj);
      console.error('[useWebSocket] Send error:', errorObj);
    }
  }, [isConnected]);

  return { data, isConnected, error, send };
}

interface RealtimeStatsHookReturn {
  stats: RealtimeStats;
  isConnected: boolean;
  error: Error | null;
  refresh: () => void;
}

const DEFAULT_STATS: RealtimeStats = {
  totalTransactions: 0,
  volumeToday: 0,
  activeUsers: 0,
  pendingAlerts: 0,
  systemHealth: 'healthy',
  avgResponseTime: 0,
};

function useRealtimeStats(): RealtimeStatsHookReturn {
  const [stats, setStats] = useState<RealtimeStats>(DEFAULT_STATS);
  const { data, isConnected, error, send } = useWebSocket<unknown>('monitoring');

  useEffect(() => {
    if (!data) return;

    try {
      const rawData = data as Record<string, unknown>;

      const parseNumber = (value: unknown, fallback = 0): number => {
        const num = Number(value);
        return isNaN(num) ? fallback : num;
      };

      const parseSystemHealth = (
        value: unknown
      ): RealtimeStats['systemHealth'] => {
        if (
          value === 'healthy' ||
          value === 'degraded' ||
          value === 'critical'
        ) {
          return value;
        }
        return 'healthy';
      };

      const payload =
        rawData.payload !== undefined
          ? (rawData.payload as Record<string, unknown>)
          : rawData;

      setStats({
        totalTransactions: parseNumber(
          payload.totalTransactions ?? payload.total_transactions
        ),
        volumeToday: parseNumber(
          payload.volumeToday ?? payload.volume_today
        ),
        activeUsers: parseNumber(
          payload.activeUsers ?? payload.active_users
        ),
        pendingAlerts: parseNumber(
          payload.pendingAlerts ?? payload.pending_alerts
        ),
        systemHealth: parseSystemHealth(
          payload.systemHealth ?? payload.system_health
        ),
        avgResponseTime: parseNumber(
          payload.avgResponseTime ?? payload.avg_response_time
        ),
      });
    } catch (parseError) {
      console.error(
        '[useRealtimeStats] Failed to parse monitoring data:',
        parseError
      );
    }
  }, [data]);

  const refresh = useCallback(() => {
    try {
      send({ type: 'REQUEST_STATS', timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('[useRealtimeStats] Failed to request stats refresh:', err);
    }
  }, [send]);

  return { stats, isConnected, error, refresh };
}

interface TransactionUpdatesHookReturn {
  transactions: TransactionUpdate[];
  latestTransaction: TransactionUpdate | null;
  isConnected: boolean;
  error: Error | null;
  clearTransactions: () => void;
  sendTransactionAction: (
    action: string,
    transactionId: string,
    payload?: Record<string, unknown>
  ) => void;
}

const MAX_TRANSACTIONS_BUFFER = 100;

function useTransactionUpdates(): TransactionUpdatesHookReturn {
  const [transactions, setTransactions] = useState<TransactionUpdate[]>([]);
  const [latestTransaction, setLatestTransaction] =
    useState<TransactionUpdate | null>(null);
  const { data, isConnected, error, send } =
    useWebSocket<unknown>('transactions');

  useEffect(() => {
    if (!data) return;

    try {
      const rawData = data as Record<string, unknown>;

      const parseTransactionStatus = (
        value: unknown
      ): TransactionUpdate['status'] => {
        if (
          value === 'pending' ||
          value === 'completed' ||
          value === 'failed' ||
          value === 'cancelled'
        ) {
          return value;
        }
        return 'pending';
      };

      const parseTransactionType = (
        value: unknown
      ): TransactionUpdate['type'] => {
        if (
          value === 'credit' ||
          value === 'debit' ||
          value === 'transfer' ||
          value === 'payment'
        ) {
          return value;
        }
        return 'payment';
      };

      const payload =
        rawData.payload !== undefined
          ? (rawData.payload as Record<string, unknown>)
          : rawData;

      const messageType = rawData.type as string | undefined;

      if (messageType === 'TRANSACTION_BATCH' && Array.isArray(payload.items)) {
        const newTransactions: TransactionUpdate[] = payload.items
          .filter(
            (item): item is Record<string, unknown> =>
              item !== null && typeof item === 'object'
          )
          .map((item) => ({
            id: String(item.id ?? ''),
            type: parseTransactionType(item.type),
            amount: Number(item.amount ?? 0),
            currency: String(item.currency ?? 'USD'),
            status: parseTransactionStatus(item.status),
            timestamp: String(
              item.timestamp ?? new Date().toISOString()
            ),
            accountId: String(item.accountId ?? item.account_id ?? ''),
            description:
              item.description !== undefined
                ? String(item.description)
                : undefined,
            metadata:
              item.metadata !== null &&
              typeof item.metadata === 'object' &&
              !Array.isArray(item.metadata)
                ? (item.metadata as Record<string, unknown>)
                : undefined,
          }));

        if (newTransactions.length > 0) {
          setLatestTransaction(newTransactions[newTransactions.length - 1]);
          setTransactions((prev) => {
            const combined = [...newTransactions, ...prev];
            return combined.slice(0, MAX_TRANSACTIONS_BUFFER);
          });
        }
        return;
      }

      const transaction: TransactionUpdate = {
        id: String(payload.id ?? ''),
        type: parseTransactionType(payload.type),
        amount: Number(payload.amount ?? 0),
        currency: String(payload.currency ?? 'USD'),
        status: parseTransactionStatus(payload.status),
        timestamp: String(
          payload.timestamp ?? new Date().toISOString()
        ),
        accountId: String(
          payload.accountId ?? payload.account_id ?? ''
        ),
        description:
          payload.description !== undefined
            ? String(payload.description)
            : undefined,
        metadata:
          payload.metadata !== null &&
          typeof payload.metadata === 'object' &&
          !Array.isArray(payload.metadata)
            ? (payload.metadata as Record<string, unknown>)
            : undefined,
      };

      if (!transaction.id) {
        console.warn(
          '[useTransactionUpdates] Received transaction without ID, skipping'
        );
        return;
      }

      setLatestTransaction(transaction);
      setTransactions((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === transaction.id);

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = transaction;
          return updated;
        }

        const updated = [transaction, ...prev];
        return updated.slice(0, MAX_TRANSACTIONS_BUFFER);
      });
    } catch (parseError) {
      console.error(
        '[useTransactionUpdates] Failed to parse transaction data:',
        parseError
      );
    }
  }, [data]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setLatestTransaction(null);
  }, []);

  const sendTransactionAction = useCallback(
    (
      action: string,
      transactionId: string,
      payload?: Record<string, unknown>
    ): void => {
      if (!action || !transactionId) {
        console.warn(
          '[useTransactionUpdates] sendTransactionAction requires action and transactionId'
        );
        return;
      }

      try {
        send({
          type: action,
          transactionId,
          timestamp: new Date().toISOString(),
          ...(payload !== undefined ? { payload } : {}),
        });
      } catch (err) {
        console.error(
          '[useTransactionUpdates] Failed to send transaction action:',
          err
        );
      }
    },
    [send]
  );

  return {
    transactions,
    latestTransaction,
    isConnected,
    error,
    clearTransactions,
    sendTransactionAction,
  };
}

export { useWebSocket, useRealtimeStats, useTransactionUpdates };
export type {
  WebSocketHookReturn,
  RealtimeStats,
  RealtimeStatsHookReturn,
  TransactionUpdate,
  TransactionUpdatesHookReturn,
};
