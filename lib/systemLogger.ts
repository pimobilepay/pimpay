import { prisma } from "@/lib/prisma";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface LogEntry {
  level?: LogLevel;
  source: string;
  action: string;
  message: string;
  details?: any;
  userId?: string;
  requestId?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
}

class SystemLogger {
  private static instance: SystemLogger;
  private buffer: LogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): SystemLogger {
    if (!SystemLogger.instance) {
      SystemLogger.instance = new SystemLogger();
    }
    return SystemLogger.instance;
  }

  async log(entry: LogEntry): Promise<void> {
    const logEntry = { ...entry, level: entry.level || "INFO" };
    
    // Also log to console for immediate visibility
    const consoleMethod = logEntry.level === "ERROR" || logEntry.level === "FATAL" 
      ? console.error 
      : logEntry.level === "WARN" 
        ? console.warn 
        : console.log;
    
    consoleMethod(`[${logEntry.level}] [${logEntry.source}] ${logEntry.action}: ${logEntry.message}`);
    
    // Add to buffer
    this.buffer.push(logEntry);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    } else if (!this.flushTimeout) {
      // Set timeout to flush after interval
      this.flushTimeout = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await prisma.systemLog.createMany({
        data: entries.map((e) => ({
          level: e.level || "INFO",
          source: e.source,
          action: e.action,
          message: e.message,
          details: e.details ? JSON.parse(JSON.stringify(e.details)) : null,
          userId: e.userId || null,
          requestId: e.requestId || null,
          duration: e.duration || null,
          ip: e.ip || null,
          userAgent: e.userAgent || null,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      // Put entries back in buffer on failure
      this.buffer.unshift(...entries);
      console.error("[SystemLogger] Failed to flush logs:", error);
    }
  }

  // Convenience methods
  async debug(source: string, action: string, message: string, details?: any): Promise<void> {
    await this.log({ level: "DEBUG", source, action, message, details });
  }

  async info(source: string, action: string, message: string, details?: any): Promise<void> {
    await this.log({ level: "INFO", source, action, message, details });
  }

  async warn(source: string, action: string, message: string, details?: any): Promise<void> {
    await this.log({ level: "WARN", source, action, message, details });
  }

  async error(source: string, action: string, message: string, details?: any): Promise<void> {
    await this.log({ level: "ERROR", source, action, message, details });
  }

  async fatal(source: string, action: string, message: string, details?: any): Promise<void> {
    await this.log({ level: "FATAL", source, action, message, details });
    // Flush immediately for fatal errors
    await this.flush();
  }
}

export const systemLogger = SystemLogger.getInstance();

// Standalone function for one-off logging without buffering
export async function logSystemEvent(entry: LogEntry): Promise<void> {
  try {
    const consoleMethod = entry.level === "ERROR" || entry.level === "FATAL" 
      ? console.error 
      : entry.level === "WARN" 
        ? console.warn 
        : console.log;
    
    consoleMethod(`[${entry.level || "INFO"}] [${entry.source}] ${entry.action}: ${entry.message}`);
    
    await prisma.systemLog.create({
      data: {
        level: entry.level || "INFO",
        source: entry.source,
        action: entry.action,
        message: entry.message,
        details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : null,
        userId: entry.userId || null,
        requestId: entry.requestId || null,
        duration: entry.duration || null,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
      },
    });
  } catch (error) {
    console.error("[logSystemEvent] Failed:", error);
  }
}

// Helper to log API errors
export async function logApiError(
  source: string,
  action: string,
  error: any,
  context?: { userId?: string; requestId?: string; ip?: string }
): Promise<void> {
  await logSystemEvent({
    level: "ERROR",
    source,
    action,
    message: error?.message || String(error),
    details: {
      stack: error?.stack?.substring(0, 2000),
      name: error?.name,
      code: error?.code,
    },
    ...context,
  });
}
