/**
 * lib/secureLogger.ts
 * [FIX V26] Secure logging that sanitizes sensitive data
 */

import { prisma } from '@/lib/prisma';

interface LogContext {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  action: string;
  category?: string;
  status?: 'SUCCESS' | 'FAILED' | 'DENIED';
  details?: Record<string, any>;
}

/**
 * Redact sensitive values from objects
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'pin', 'secret', 'token', 'apiKey', 'privateKey',
    'creditCard', 'ssn', 'salt', 'hash', 'refreshToken',
    'accessToken', 'authCode', 'twoFactorSecret'
  ];
  
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
}

/**
 * Sanitize email - show only first char and domain
 */
function sanitizeEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[INVALID_EMAIL]';
  return `${local[0]}***@${domain}`;
}

/**
 * Sanitize IP - hide last octet
 */
function sanitizeIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = 'xxx';
    return parts.join('.');
  }
  return ip; // IPv6 or invalid, return as-is
}

/**
 * Log security event with sanitization
 */
export async function logSecurityEvent(context: LogContext): Promise<void> {
  try {
    const sanitized = {
      ...context,
      email: sanitizeEmail(context.email),
      ip: sanitizeIp(context.ip),
      details: redactSensitiveData(context.details),
    };
    
    // Store in SecurityLog (user-visible in their security history)
    if (context.userId) {
      await prisma.securityLog.create({
        data: {
          userId: context.userId,
          action: context.action,
          ip: context.ip,
          device: context.userAgent?.substring(0, 255),
        },
      }).catch(() => {});
    }
    
    // Store in AuditLog (admin-visible)
    await prisma.auditLog.create({
      data: {
        adminId: context.userId,
        action: context.action,
        category: context.category || 'security',
        ip: context.ip,
        userAgent: context.userAgent,
        status: context.status || 'SUCCESS',
        details: JSON.stringify(sanitized),
      },
    }).catch(() => {});
    
    // Log to SystemLog (for alerting)
    await prisma.systemLog.create({
      data: {
        level: context.status === 'FAILED' ? 'WARN' : 'INFO',
        source: 'SECURITY',
        action: context.action,
        message: `${context.action} - ${context.status || 'SUCCESS'}`,
        details: sanitized,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    }).catch(() => {});
    
  } catch (error) {
    console.error('[LOGGER] Failed to log security event:', error);
    // Fail silently to not break application flow
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  action: 'LOGIN' | 'LOGOUT' | 'MFA' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED',
  userId: string,
  email: string,
  ip: string,
  userAgent: string,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
): Promise<void> {
  await logSecurityEvent({
    userId,
    email,
    ip,
    userAgent,
    action,
    category: 'authentication',
    status,
  });
}

/**
 * Log transaction event
 */
export async function logTransactionEvent(
  action: string,
  userId: string,
  amount: number,
  currency: string,
  recipient?: string,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
): Promise<void> {
  await logSecurityEvent({
    userId,
    action,
    category: 'finance',
    status,
    details: {
      amount,
      currency,
      recipient: recipient ? '[REDACTED]' : undefined,
    },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  action: string,
  userId: string | undefined,
  ip: string,
  reason: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    userId,
    ip,
    action,
    category: 'security',
    status: 'DENIED',
    details: {
      reason,
      ...redactSensitiveData(details),
    },
  });
}
