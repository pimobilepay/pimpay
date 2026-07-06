/**
 * lib/inputValidation.ts
 * [FIX V30] Input validation and sanitization
 * Prevents XSS, injection attacks, and malformed data
 */

import validator from 'validator';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

/**
 * Validate username (alphanumeric, 3-20 chars)
 */
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}

/**
 * Validate password strength
 * - Min 12 characters
 * - At least 1 uppercase
 * - At least 1 lowercase
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Minimum 12 characters required');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter required');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least 1 lowercase letter required');
  }
  if (!/\d/.test(password)) {
    errors.push('At least 1 number required');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('At least 1 special character required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate PIN (6 digits)
 */
export function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: any): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M
}

/**
 * Validate wallet address (basic check)
 */
export function validateWalletAddress(address: string, chain: string): boolean {
  // Ethereum-like (including Sidra)
  if (chain === 'SIDRA' || chain === 'ETH') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  // XRP address
  if (chain === 'XRP') {
    return /^r[a-zA-Z0-9]{24,34}$/.test(address);
  }
  // Stellar
  if (chain === 'STELLAR') {
    return /^G[A-Z2-7]{56}$/.test(address);
  }
  return false;
}

/**
 * Sanitize string (XSS prevention)
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return '';
  return validator.escape(str).trim();
}

/**
 * Sanitize HTML (whitelist approach)
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate URL (prevent open redirects)
 */
export function validateRedirectUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    
    if (!domain) return false;
    
    // Check against whitelist
    return allowedDomains.some(allowed => 
      domain === allowed || domain.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

/**
 * Validate bank account number
 */
export function validateBankAccount(accountNumber: string): boolean {
  // Basic check: alphanumeric, 10-34 characters
  return /^[a-zA-Z0-9]{10,34}$/.test(accountNumber);
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function validateCountryCode(code: string): boolean {
  const validCodes = [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'RO', 'BG',
    'CG', 'CM', 'GA', 'CD', 'SN', 'BJ', 'CI', 'ML', 'BF', 'NE',
    'TD', 'CF', 'MG', 'MZ', 'ZA', 'NG', 'KE', 'ET', 'ZM', 'ZW',
    // Add more as needed
  ];
  return validCodes.includes(code.toUpperCase());
}
