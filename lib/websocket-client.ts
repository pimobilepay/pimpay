import { EventEmitter } from 'events';

// ─── Connection State ────────────────────────────────────────────────────────

export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

// ─── Channel Types ───────────────────────────────────────────────────────────

export type Channel =
  | 'transactions'
  | 'alerts'
  | 'rates'
  | 'monitoring'
  | 'compliance';

// ─── Message Types ───────────────────────────────────────────────────────────

export enum MessageType {
  TRANSACTION_UPDATE = 'TRANSACTION_UPDATE',
  NEW_ALERT = 'NEW_ALERT',
  RATE_UPDATE = 'RATE_UPDATE',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  PING = 'PING',
  PONG = 'PONG',
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  ACK = 'ACK',
  ERROR = 'ERROR',
}

// ─── Payload Interfaces ──────────────────────────────────────────────────────

export interface TransactionUpdatePayload {
  transactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  amount: number;
  currency: 'XAF' | 'XOF' | 'USD' | 'EUR';
  sender: string;
  recipient: string;
  timestamp: string;
  reference: string;
  channel: 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CASH';
}

export interface NewAlertPayload {
  alertId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  category: 'SECURITY' | 'TRANSACTION' | 'SYSTEM' | 'COMPLIANCE';
  userId?: string;
  accountId?: string;
}

export interface RateUpdatePayload {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  previousRate: number;
  change: number;
  changePercent: number;
  timestamp: string;
  provider: string;
}

export interface SystemStatusPayload {
  service: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE';
  message: string;
  timestamp: string;
  affectedRegions?: string[];
  estimatedResolution?: string;
}

export interface ComplianceAlertPayload {
  alertId: string;
  type:
    | 'AML_TRIGGER'
    | 'KYC_EXPIRED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'THRESHOLD_BREACH'
    | 'SANCTIONS_HIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  entityId: string;
  entityType: 'USER' | 'ACCOUNT' | 'TRANSACTION';
  timestamp: string;
  requiresAction: boolean;
  dueBy?: string;
}

// ─── Message Union ────────────────────────────────────────────────────────────

export type WebSocketMessagePayload =
  | TransactionUpdatePayload
  | NewAlertPayload
  | RateUpdatePayload
  | SystemStatusPayload
  | ComplianceAlertPayload;

export interface WebSocketMessage<T extends WebSocketMessagePayload = WebSocketMessagePayload> {
  id: string;
  type: MessageType;
  channel: Channel;
  payload: T;
  timestamp: string;
  version: string;
}

export interface PingMessage {
  id: string;
  type: MessageType.PING;
  timestamp: string;
}

export interface PongMessage {
  id: string;
  type: MessageType.PONG;
  timestamp: string;
}

export interface SubscribeMessage {
  id: string;
  type: MessageType.SUBSCRIBE;
  channel: Channel;
  timestamp: string;
}

export interface UnsubscribeMessage {
  id: string;
  type: MessageType.UNSUBSCRIBE;
  channel: Channel;
  timestamp: string;
}

export interface AckMessage {
  id: string;
  type: MessageType.ACK;
  ref: string;
  timestamp: string;
}

export interface ErrorMessage {
  id: string;
  type: MessageType.ERROR;
  code: number;
  message: string;
  ref?: string;
  timestamp: string;
}

// ─── Typed Callback Map ──────────────────────────────────────────────────────

export type ChannelCallbackMap = {
  transactions: (payload: TransactionUpdatePayload) => void;
  alerts: (payload: NewAlertPayload) => void;
  rates: (payload: RateUpdatePayload) => void;
  monitoring: (payload: SystemStatusPayload) => void;
  compliance: (payload: ComplianceAlertPayload) => void;
};

export type ChannelCallback<C extends Channel> = ChannelCallbackMap[C];

// ─── WebSocket Client Events ─────────────────────────────────────────────────

export interface WebSocketClientEvents {
  stateChange: (state: ConnectionState) => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number, delay: number) => void;
  reconnected: () => void;
  message: (message: WebSocketMessage) => void;
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface WebSocketClientConfig {
  url: string;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  reconnectBackoff: number[];
  protocols?: string | string[];
  token?: string;
}

const DEFAULT_CONFIG: WebSocketClientConfig = {
  url: 'wss://pimpay.vercel.app/ws',
  heartbeatInterval: 30_000,
  maxReconnectAttempts: Infinity,
  reconnectBackoff: [1_000, 2_000, 4_000, 8_000],
  protocols: ['pimpay-v1'],
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── WebSocket Manager ────────────────────────────────────────────────────────

class PimpayWebSocketClient {
  private static instance: PimpayWebSocketClient | null = null;

  private ws: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private emitter: EventEmitter = new EventEmitter();

  // Reconnect state
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose: boolean = false;

  // Heartbeat state
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pongTimeout: number = 10_000;

  // Subscription registry: channel -> Set of callbacks
  private subscriptions: Map<Channel, Set<ChannelCallback<Channel>>> = new Map();

  // Pending subscriptions to re-issue on reconnect
  private pendingChannels: Set<Channel> = new Set();

  // ─── Private Constructor (Singleton) ──────────────────────────────────────

  private constructor(config: Partial<WebSocketClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.emitter.setMaxListeners(50);
  }

  // ─── Singleton Access ─────────────────────────────────────────────────────

  public static getInstance(config?: Partial<WebSocketClientConfig>): PimpayWebSocketClient {
    if (!PimpayWebSocketClient.instance) {
      PimpayWebSocketClient.instance = new PimpayWebSocketClient(config);
    }
    return PimpayWebSocketClient.instance;
  }

  public static resetInstance(): void {
    if (PimpayWebSocketClient.instance) {
      PimpayWebSocketClient.instance.disconnect();
      PimpayWebSocketClient.instance = null;
    }
  }

  // ─── Public State ─────────────────────────────────────────────────────────

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  // ─── Event Emitter Wrappers ───────────────────────────────────────────────

  public on<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K],
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public off<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K],
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  public once<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K],
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  private emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): void {
    this.emitter.emit(event, ...args);
  }

  // ─── Connection Management ────────────────────────────────────────────────

  public connect(token?: string): void {
    if (
      this.state === ConnectionState.CONNECTING ||
      this.state === ConnectionState.CONNECTED
    ) {
      return;
    }

    if (token) {
      this.config.token = token;
    }

    this.intentionalClose = false;
    this.establishConnection();
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this.setState(ConnectionState.DISCONNECTING);
      this.ws.close(1000, 'Client disconnect');
    } else {
      this.setState(ConnectionState.DISCONNECTED);
    }
  }

  private establishConnection(): void {
    this.setState(ConnectionState.CONNECTING);

    try {
      const url = this.buildUrl();
      this.ws = this.config.protocols
        ? new WebSocket(url, this.config.protocols)
        : new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private buildUrl(): string {
    const url = new URL(this.config.url);
    if (this.config.token) {
      url.searchParams.set('token', this.config.token);
    }
    return url.toString();
  }

  // ─── WebSocket Handlers ───────────────────────────────────────────────────

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.setState(ConnectionState.CONNECTED);
    this.startHeartbeat();
    this.resubscribeChannels();

    if (this.reconnectAttempts === 0 && this.intentionalClose === false) {
      // Only emit reconnected if this was a recovery, not initial connect.
      // We track this via a separate flag below.
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.ws = null;

    if (this.intentionalClose) {
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.scheduleReconnect();
  }

  private handleError(event: Event): void {
    const error = new Error(
      `WebSocket error on channel ${(event as ErrorEvent).message ?? 'unknown'}`,
    );
    this.emit('error', error);
  }

  private handleMessage(event: MessageEvent): void {
    let data: unknown;

    try {
      data = JSON.parse(event.data as string);
    } catch {
      this.emit('error', new Error('Failed to parse WebSocket message'));
      return;
    }

    const raw = data as Record<string, unknown>;

    if (raw.type === MessageType.PING) {
      this.sendPong(raw.id as string);
      return;
    }

    if (raw.type === MessageType.PONG) {
      this.handlePong();
      return;
    }

    if (raw.type === MessageType.ERROR) {
      const errMsg = raw as unknown as ErrorMessage;
      this.emit('error', new Error(`Server error [${errMsg.code}]: ${errMsg.message}`));
      return;
    }

    if (raw.type === MessageType.ACK) {
      return;
    }

    // Channel messages
    const message = raw as unknown as WebSocketMessage;
    this.emit('message', message);
    this.dispatchToSubscribers(message);
  }

  private handleConnectionError(error: unknown): void {
    const err =
      error instanceof Error ? error : new Error(String(error));
    this.emit('error', err);
    this.setState(ConnectionState.DISCONNECTED);
    this.scheduleReconnect();
  }

  // ─── Reconnect Logic ──────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    const backoff = this.config.reconnectBackoff;
    const index = Math.min(this.reconnectAttempts, backoff.length - 1);
    const delay = backoff[index];

    this.reconnectAttempts += 1;
    this.emit('reconnecting', this.reconnectAttempts, delay);

    this.reconnectTimer = setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ─── Heartbeat ────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimer();
  }

  private sendPing(): void {
    if (!this.isConnected() || !this.ws) return;

    const ping: PingMessage = {
      id: generateId(),
      type: MessageType.PING,
      timestamp: now(),
    };

    this.ws.send(JSON.stringify(ping));

    // Expect pong within pongTimeout
    this.pongTimer = setTimeout(() => {
      this.emit(
        'error',
        new Error('Heartbeat timeout: no pong received within expected window'),
      );
      this.ws?.close(4000, 'Heartbeat timeout');
    }, this.pongTimeout);
  }

  private sendPong(refId: string): void {
    if (!this.isConnected() || !this.ws) return;

    const pong: PongMessage = {
      id: refId,
      type: MessageType.PONG,
      timestamp: now(),
    };

    this.ws.send(JSON.stringify(pong));
  }

  private handlePong(): void {
    this.clearPongTimer();
  }

  private clearPongTimer(): void {
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ─── State Management ─────────────────────────────────────────────────────

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('stateChange', state);

    if (state === ConnectionState.CONNECTED && this.reconnectAttempts > 0) {
      this.emit('reconnected');
    }
  }

  // ─── Subscription System ──────────────────────────────────────────────────

  public subscribe<C extends Channel>(
    channel: C,
    callback: ChannelCallback<C>,
  ): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    const callbacks = this.subscriptions.get(channel)!;
    callbacks.add(callback as ChannelCallback<Channel>);
    this.pendingChannels.add(channel);

    if (this.isConnected()) {
      this.sendSubscribe(channel);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(channel, callback);
  }

  public unsubscribe<C extends Channel>(
    channel: C,
    callback?: ChannelCallback<C>,
  ): void {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback as ChannelCallback<Channel>);
    } else {
      callbacks.clear();
    }

    if (callbacks.size === 0) {
      this.subscriptions.delete(channel);
      this.pendingChannels.delete(channel);

      if (this.isConnected()) {
        this.sendUnsubscribe(channel);
      }
    }
  }

  public unsubscribeAll(): void {
    const channels = Array.from(this.subscriptions.keys()) as Channel[];
    channels.forEach((channel) => {
      if (this.isConnected()) {
        this.sendUnsubscribe(channel);
      }
    });
    this.subscriptions.clear();
    this.pendingChannels.clear();
  }

  private sendSubscribe(channel: Channel): void {
    if (!this.ws || !this.isConnected()) return;

    const msg: SubscribeMessage = {
      id: generateId(),
      type: MessageType.SUBSCRIBE,
      channel,
      timestamp: now(),
    };

    this.ws.send(JSON.stringify(msg));
  }

  private sendUnsubscribe(channel: Channel): void {
    if (!this.ws || !this.isConnected()) return;

    const msg: UnsubscribeMessage = {
      id: generateId(),
      type: MessageType.UNSUBSCRIBE,
      channel,
      timestamp: now(),
    };

    this.ws.send(JSON.stringify(msg));
  }

  private resubscribeChannels(): void {
    this.pendingChannels.forEach((channel) => {
      this.sendSubscribe(channel);
    });
  }

  // ─── Message Dispatch ─────────────────────────────────────────────────────

  private dispatchToSubscribers(message: WebSocketMessage): void {
    const channel = message.channel;
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks || callbacks.size === 0) return;

    callbacks.forEach((callback) => {
      try {
        (callback as (payload: WebSocketMessagePayload) => void)(message.payload);
      } catch (err) {
        this.emit(
          'error',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    });
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  public send(data: Record<string, unknown>): boolean {
    if (!this.isConnected() || !this.ws) return false;

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (err) {
      this.emit(
        'error',
        err instanceof Error ? err : new Error(String(err)),
      );
      return false;
    }
  }

  public getActiveChannels(): Channel[] {
    return Array.from(this.subscriptions.keys()) as Channel[];
  }

  public getSubscriberCount(channel: Channel): number {
    return this.subscriptions.get(channel)?.size ?? 0;
  }

  public setToken(token: string): void {
    this.config.token = token;
  }
}

// ─── Exported Singleton ───────────────────────────────────────────────────────

export const websocketClient = PimpayWebSocketClient.getInstance();

export { PimpayWebSocketClient };
export default PimpayWebSocketClient;
