/**
 * PIMPAY Banking Portal - Validators Utility
 * Comprehensive validation for CEMAC zone banking operations
 */

// ============================================================
// Types & Interfaces
// ============================================================

export interface IBANValidationResult {
  valid: boolean;
  country: string;
  bankCode?: string;
  branchCode?: string;
  accountNumber?: string;
  error?: string;
}

export interface BICValidationResult {
  valid: boolean;
  bankName?: string;
  countryCode?: string;
  locationCode?: string;
  branchCode?: string;
  error?: string;
}

export interface AmountValidationResult {
  valid: boolean;
  formattedAmount?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  details?: Record<string, unknown>;
}

export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noCommonPatterns: boolean;
  };
}

export interface CSVValidationResult {
  valid: boolean;
  rowCount: number;
  errors: string[];
  warnings?: string[];
  headers?: string[];
}

export interface AmountLimits {
  min?: number;
  max?: number;
}

// ============================================================
// CEMAC Constants & Configuration
// ============================================================

export const CEMAC_COUNTRIES = {
  CG: { name: 'Republic of Congo', ibanLength: 27, phonePrefix: '+242', currency: 'XAF' },
  CM: { name: 'Cameroon', ibanLength: 27, phonePrefix: '+237', currency: 'XAF' },
  GA: { name: 'Gabon', ibanLength: 27, phonePrefix: '+241', currency: 'XAF' },
  GQ: { name: 'Equatorial Guinea', ibanLength: 27, phonePrefix: '+240', currency: 'XAF' },
  CF: { name: 'Central African Republic', ibanLength: 27, phonePrefix: '+236', currency: 'XAF' },
  TD: { name: 'Chad', ibanLength: 27, phonePrefix: '+235', currency: 'XAF' },
} as const;

export type CEMACCountryCode = keyof typeof CEMAC_COUNTRIES;

export const CEMAC_COUNTRY_CODES = Object.keys(CEMAC_COUNTRIES) as CEMACCountryCode[];

export const SUPPORTED_CURRENCIES = ['XAF', 'EUR', 'USD', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LIMITS: Record<string, { min: number; max: number }> = {
  XAF: { min: 100, max: 10_000_000_000 },
  EUR: { min: 1, max: 10_000_000 },
  USD: { min: 1, max: 10_000_000 },
  GBP: { min: 1, max: 10_000_000 },
};

const CEMAC_BANK_BIC_MAP: Record<string, string> = {
  BCANCMCM: 'Banque Centrale du Cameroun',
  ECOCMCM: 'Ecobank Cameroun',
  SGCMCMCM: 'Société Générale Cameroun',
  AFBACMCM: 'Afriland First Bank Cameroun',
  CCIACMCM: 'CCIA Bank Cameroun',
  BGFIGABB: 'BGFI Bank Gabon',
  ECOCGABG: 'Ecobank Gabon',
  UNIOGABG: 'Union Gabonaise de Banque',
  BGFICGCG: 'BGFI Bank Congo',
  LCCBCGCG: 'La Congolaise de Banque',
  ECOCGCCG: 'Ecobank Congo',
  CBCATDTD: 'Commercial Bank Tchad',
  SGCBTDTD: 'Société Générale Tchad',
  BCCAGQGQ: 'BGFI Bank Equatorial Guinea',
  BGFICFCF: 'BGFI Bank RCA',
};

const PHONE_PATTERNS: Record<string, { pattern: RegExp; description: string }> = {
  CG: {
    pattern: /^(\+242|00242|242)?[0-9]{9}$/,
    description: 'Congo: +242 followed by 9 digits',
  },
  CM: {
    pattern: /^(\+237|00237|237)?[6-9][0-9]{8}$/,
    description: 'Cameroon: +237 followed by 9 digits starting with 6-9',
  },
  GA: {
    pattern: /^(\+241|00241|241)?[0-9]{8}$/,
    description: 'Gabon: +241 followed by 8 digits',
  },
  GQ: {
    pattern: /^(\+240|00240|240)?[0-9]{9}$/,
    description: 'Equatorial Guinea: +240 followed by 9 digits',
  },
  CF: {
    pattern: /^(\+236|00236|236)?[0-9]{8}$/,
    description: 'Central African Republic: +236 followed by 8 digits',
  },
  TD: {
    pattern: /^(\+235|00235|235)?[0-9]{8}$/,
    description: 'Chad: +235 followed by 8 digits',
  },
};

const COMMON_PASSWORDS = [
  'password', 'password123', '123456789', 'qwerty123',
  'admin123', 'letmein', 'welcome1', 'monkey123',
  'dragon123', 'master123', 'abc123456', 'iloveyou',
];

const TRANSACTION_REQUIRED_FIELDS = [
  'amount', 'currency', 'fromAccount', 'toAccount',
  'transactionType', 'reference',
];

const XML_MESSAGE_SCHEMAS: Record<string, { requiredTags: string[]; optionalTags: string[] }> = {
  pain001: {
    requiredTags: ['CstmrCdtTrfInitn', 'GrpHdr', 'MsgId', 'CreDtTm', 'NbOfTxs', 'PmtInf'],
    optionalTags: ['CtrlSum', 'InitgPty', 'PmtMtd'],
  },
  pain008: {
    requiredTags: ['CstmrDrctDbtInitn', 'GrpHdr', 'MsgId', 'CreDtTm', 'NbOfTxs', 'PmtInf'],
    optionalTags: ['CtrlSum', 'InitgPty'],
  },
  camt053: {
    requiredTags: ['BkToCstmrStmt', 'GrpHdr', 'MsgId', 'CreDtTm', 'Stmt'],
    optionalTags: ['MsgRcpt', 'MsgPgntn'],
  },
  camt054: {
    requiredTags: ['BkToCstmrDbtCdtNtfctn', 'GrpHdr', 'MsgId', 'CreDtTm', 'Ntfctn'],
    optionalTags: [],
  },
  pacs008: {
    requiredTags: ['FIToFICstmrCdtTrf', 'GrpHdr', 'MsgId', 'CreDtTm', 'NbOfTxs', 'CdtTrfTxInf'],
    optionalTags: ['TtlIntrBkSttlmAmt', 'IntrBkSttlmDt'],
  },
};

const CSV_REQUIRED_HEADERS = ['reference', 'amount', 'currency', 'fromAccount', 'toAccount'];
const CSV_MAX_FILE_SIZE_MB = 10;
const CSV_MAX_ROWS = 10_000;

// ============================================================
// IBAN Utilities
// ============================================================

function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .toUpperCase()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : char;
    })
    .join('');

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 9) {
    const chunk = remainder.toString() + numeric.slice(i, i + 9);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder;
}

// ============================================================
// Core Validators
// ============================================================

/**
 * Validates an IBAN with specific support for CEMAC zone countries.
 */
export function validateIBAN(iban: string): IBANValidationResult {
  if (!iban || typeof iban !== 'string') {
    return { valid: false, country: '', error: 'IBAN must be a non-empty string.' };
  }

  const cleaned = iban.replace(/\s+/g, '').toUpperCase();

  if (cleaned.length < 15 || cleaned.length > 34) {
    return {
      valid: false,
      country: cleaned.slice(0, 2),
      error: `IBAN length ${cleaned.length} is invalid. Expected between 15 and 34 characters.`,
    };
  }

  const countryCode = cleaned.slice(0, 2) as CEMACCountryCode;

  if (!CEMAC_COUNTRY_CODES.includes(countryCode)) {
    return {
      valid: false,
      country: countryCode,
      error: `Country code "${countryCode}" is not a supported CEMAC country. Supported: ${CEMAC_COUNTRY_CODES.join(', ')}.`,
    };
  }

  const expectedLength = CEMAC_COUNTRIES[countryCode].ibanLength;
  if (cleaned.length !== expectedLength) {
    return {
      valid: false,
      country: countryCode,
      error: `IBAN for ${CEMAC_COUNTRIES[countryCode].name} must be exactly ${expectedLength} characters long. Got ${cleaned.length}.`,
    };
  }

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return {
      valid: false,
      country: countryCode,
      error: 'IBAN contains invalid characters. Only alphanumeric characters are allowed.',
    };
  }

  const checksum = mod97(cleaned);
  if (checksum !== 1) {
    return {
      valid: false,
      country: countryCode,
      error: `IBAN checksum validation failed (mod97 = ${checksum}). The IBAN may contain a typo.`,
    };
  }

  // Parse BBAN components (country-specific structure: 5-digit bank, 5-digit branch, 11-digit account, 2-digit key)
  const bban = cleaned.slice(4);
  return {
    valid: true,
    country: countryCode,
    bankCode: bban.slice(0, 5),
    branchCode: bban.slice(5, 10),
    accountNumber: bban.slice(10, 21),
  };
}

/**
 * Validates a BIC/SWIFT code and optionally resolves it to a known CEMAC bank name.
 */
export function validateBIC(bic: string): BICValidationResult {
  if (!bic || typeof bic !== 'string') {
    return { valid: false, error: 'BIC must be a non-empty string.' };
  }

  const cleaned = bic.replace(/\s+/g, '').toUpperCase();

  if (cleaned.length !== 8 && cleaned.length !== 11) {
    return {
      valid: false,
      error: `BIC must be 8 or 11 characters long. Got ${cleaned.length}.`,
    };
  }

  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
    return {
      valid: false,
      error: 'BIC format is invalid. Expected format: BBBBCCLLBBB (bank, country, location, branch).',
    };
  }

  const bankCode = cleaned.slice(0, 4);
  const countryCode = cleaned.slice(4, 6);
  const locationCode = cleaned.slice(6, 8);
  const branchCode = cleaned.length === 11 ? cleaned.slice(8, 11) : 'XXX';

  const bankName = CEMAC_BANK_BIC_MAP[cleaned] ?? CEMAC_BANK_BIC_MAP[cleaned.slice(0, 8)];

  return {
    valid: true,
    bankName,
    countryCode,
    locationCode,
    branchCode,
  };
}

/**
 * Validates a monetary amount against currency rules and optional min/max limits.
 */
export function validateAmount(
  amount: number,
  currency: string,
  limits?: AmountLimits
): AmountValidationResult {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number.' };
  }

  if (!currency || typeof currency !== 'string') {
    return { valid: false, error: 'Currency code must be provided.' };
  }

  const currencyUpper = currency.toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(currencyUpper as SupportedCurrency)) {
    return {
      valid: false,
      error: `Currency "${currency}" is not supported. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}.`,
    };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero.' };
  }

  // XAF has no decimal places (whole francs)
  if (currencyUpper === 'XAF' && !Number.isInteger(amount)) {
    return { valid: false, error: 'XAF amounts must be whole numbers (no decimal places).' };
  }

  // Other currencies max 2 decimal places
  if (currencyUpper !== 'XAF') {
    const decimalStr = amount.toString().split('.')[1];
    if (decimalStr && decimalStr.length > 2) {
      return { valid: false, error: `${currency} amounts cannot have more than 2 decimal places.` };
    }
  }

  const globalLimits = CURRENCY_LIMITS[currencyUpper];
  const effectiveLimits = {
    min: limits?.min ?? globalLimits.min,
    max: limits?.max ?? globalLimits.max,
  };

  if (amount < effectiveLimits.min) {
    return {
      valid: false,
      error: `Amount ${amount} is below the minimum allowed (${effectiveLimits.min} ${currencyUpper}).`,
    };
  }

  if (amount > effectiveLimits.max) {
    return {
      valid: false,
      error: `Amount ${amount} exceeds the maximum allowed (${effectiveLimits.max} ${currencyUpper}).`,
    };
  }

  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyUpper,
    minimumFractionDigits: currencyUpper === 'XAF' ? 0 : 2,
    maximumFractionDigits: currencyUpper === 'XAF' ? 0 : 2,
  });

  return { valid: true, formattedAmount: formatter.format(amount) };
}

/**
 * Asynchronously validates an ISO 20022 XML message by checking for required tags
 * and well-formedness.
 */
export async function validateXMLMessage(
  xml: string,
  messageType: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
    return { valid: false, errors: ['XML message must be a non-empty string.'] };
  }

  if (!messageType || typeof messageType !== 'string') {
    return { valid: false, errors: ['Message type must be specified.'] };
  }

  const normalizedType = messageType.toLowerCase().replace(/[^a-z0-9]/g, '');
  const schema = XML_MESSAGE_SCHEMAS[normalizedType];

  if (!schema) {
    return {
      valid: false,
      errors: [
        `Unknown message type "${messageType}". Supported types: ${Object.keys(XML_MESSAGE_SCHEMAS).join(', ')}.`,
      ],
    };
  }

  // Check XML declaration
  if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
    errors.push('XML message does not appear to be well-formed XML.');
  }

  // Check for opening and closing tags balance (basic well-formedness)
  const openTags = (xml.match(/<[^/?!][^>]*(?<!\/)>/g) ?? []).length;
  const closeTags = (xml.match(/<\/[^>]+>/g) ?? []).length;
  const selfClosingTags = (xml.match(/<[^>]*\/>/g) ?? []).length;

  if (openTags !== closeTags + selfClosingTags && openTags > closeTags) {
    warnings.push(
      'XML may have unbalanced tags. Consider validating against the official XSD schema.'
    );
  }

  // Validate required tags
  for (const tag of schema.requiredTags) {
    const openRegex = new RegExp(`<${tag}[\\s>]`);
    const closedRegex = new RegExp(`</${tag}>`);
    if (!openRegex.test(xml) && !closedRegex.test(xml)) {
      errors.push(`Required XML element <${tag}> is missing from ${messageType} message.`);
    }
  }

  // Warn about optional but recommended tags
  for (const tag of schema.optionalTags) {
    const regex = new RegExp(`<${tag}[\\s>]`);
    if (!regex.test(xml)) {
      warnings.push(`Optional but recommended XML element <${tag}> is absent.`);
    }
  }

  // Check for suspicious/dangerous content (XXE, etc.)
  if (/<!ENTITY/i.test(xml) || /<!DOCTYPE/i.test(xml)) {
    errors.push(
      'XML contains DOCTYPE or ENTITY declarations which are not allowed for security reasons.'
    );
  }

  // Validate MsgId presence and format
  const msgIdMatch = xml.match(/<MsgId>([^<]+)<\/MsgId>/);
  if (msgIdMatch) {
    if (msgIdMatch[1].length > 35) {
      errors.push('MsgId exceeds maximum length of 35 characters per ISO 20022 standard.');
    }
  }

  // Validate CreDtTm format (ISO 8601)
  const dtMatch = xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/);
  if (dtMatch) {
    const dt = new Date(dtMatch[1]);
    if (isNaN(dt.getTime())) {
      errors.push(`CreDtTm value "${dtMatch[1]}" is not a valid ISO 8601 date-time.`);
    }
  }

  // Validate currency codes in the message
  const amtMatches = xml.matchAll(/Ccy="([A-Z]{3})"/g);
  for (const match of amtMatches) {
    if (!SUPPORTED_CURRENCIES.includes(match[1] as SupportedCurrency)) {
      warnings.push(`Currency code "${match[1]}" found in XML is not in the PIMPAY supported list.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: { messageType: normalizedType, schemaChecked: true },
  };
}

/**
 * Validates a transaction object for completeness and business rule compliance.
 */
export function validateTransaction(tx: Record<string, unknown>): TransactionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tx || typeof tx !== 'object') {
    return { valid: false, errors: ['Transaction must be a valid object.'] };
  }

  // Required fields
  for (const field of TRANSACTION_REQUIRED_FIELDS) {
    if (tx[field] === undefined || tx[field] === null || tx[field] === '') {
      errors.push(`Required field "${field}" is missing or empty.`);
    }
  }

  // Amount validation
  if (tx.amount !== undefined) {
    const amountResult = validateAmount(
      tx.amount as number,
      (tx.currency as string) ?? 'XAF'
    );
    if (!amountResult.valid) {
      errors.push(`Amount validation failed: ${amountResult.error}`);
    }
  }

  // Currency validation
  if (tx.currency) {
    const curr = (tx.currency as string).toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(curr as SupportedCurrency)) {
      errors.push(`Unsupported currency "${tx.currency}".`);
    }
  }

  // IBAN validation for fromAccount
  if (tx.fromAccount) {
    const ibanResult = validateIBAN(tx.fromAccount as string);
    if (!ibanResult.valid) {
      errors.push(`Source account IBAN invalid: ${ibanResult.error}`);
    }
  }

  // IBAN validation for toAccount
  if (tx.toAccount) {
    const ibanResult = validateIBAN(tx.toAccount as string);
    if (!ibanResult.valid) {
      errors.push(`Destination account IBAN invalid: ${ibanResult.error}`);
    }
  }

  // Self-transfer check
  if (tx.fromAccount && tx.toAccount && tx.fromAccount === tx.toAccount) {
    errors.push('Source and destination accounts cannot be the same.');
  }

  // Reference format
  if (tx.reference) {
    const ref = tx.reference as string;
    if (ref.length < 1 || ref.length > 35) {
      errors.push('Transaction reference must be between 1 and 35 characters.');
    }
    if (!/^[a-zA-Z0-9 .,-_/]+$/.test(ref)) {
      errors.push(
        'Transaction reference contains invalid characters. Only alphanumeric and . , - _ / characters are allowed.'
      );
    }
  }

  // Transaction type
  const validTypes = ['CREDIT', 'DEBIT', 'TRANSFER', 'PAYMENT', 'SALARY', 'BULK'];
  if (tx.transactionType) {
    const txType = (tx.transactionType as string).toUpperCase();
    if (!validTypes.includes(txType)) {
      errors.push(
        `Invalid transaction type "${tx.transactionType}". Allowed: ${validTypes.join(', ')}.`
      );
    }
  }

  // Value date validation
  if (tx.valueDate) {
    const valueDate = new Date(tx.valueDate as string);
    if (isNaN(valueDate.getTime())) {
      errors.push('Value date is not a valid date.');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxFutureDate = new Date(today);
      maxFutureDate.setDate(maxFutureDate.getDate() + 365);
      if (valueDate < today) {
        warnings.push('Value date is in the past.');
      }
      if (valueDate > maxFutureDate) {
        errors.push('Value date cannot be more than 365 days in the future.');
      }
    }
  }

  // BIC validation if provided
  if (tx.bic) {
    const bicResult = validateBIC(tx.bic as string);
    if (!bicResult.valid) {
      errors.push(`BIC/SWIFT validation failed: ${bicResult.error}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates an account number based on the specified account type.
 */
export function validateAccountNumber(account: string, type: string): boolean {
  if (!account || typeof account !== 'string' || !type) return false;

  const cleaned = account.trim().toUpperCase();
  const accountType = type.toUpperCase();

  switch (accountType) {
    case 'IBAN':
      return validateIBAN(cleaned).valid;

    case 'BBAN': {
      // CEMAC BBAN: 5 bank + 5 branch + 11 account + 2 key = 23 digits
      return /^[0-9]{23}$/.test(cleaned);
    }

    case 'INTERNAL': {
      // PIMPAY internal account: PIMPAY- followed by 10 alphanumeric chars
      return /^PIMPAY-[A-Z0-9]{10}$/.test(cleaned);
    }

    case 'MOBILE': {
      // Mobile money accounts: country prefix + 9-12 digits
      return /^[A-Z]{2}[0-9]{9,12}$/.test(cleaned);
    }

    case 'SAVINGS':
    case 'CURRENT': {
      // Standard account number: 10-16 digits
      return /^[0-9]{10,16}$/.test(cleaned);
    }

    case 'LOAN': {
      // Loan account: L followed by 12 digits
      return /^L[0-9]{12}$/.test(cleaned);
    }

    default:
      // Generic: alphanumeric 5-34 chars
      return /^[A-Z0-9]{5,34}$/.test(cleaned);
  }
}

/**
 * Validates a phone number for supported CEMAC countries.
 */
export function validatePhoneNumber(phone: string, country: string): boolean {
  if (!phone || typeof phone !== 'string' || !country || typeof country !== 'string') {
    return false;
  }

  const countryUpper = country.toUpperCase() as CEMACCountryCode;
  const cleaned = phone.replace(/[\s\-().]/g, '');

  const config = PHONE_PATTERNS[countryUpper];
  if (!config) return false;

  return config.pattern.test(cleaned);
}

/**
 * Validates an email address.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) return false;

  // Additional checks
  if (email.length > 254) return false;
  const [local, domain] = email.split('@');
  if (local.length > 64) return false;
  if (domain.split('.').some((part) => part.length > 63)) return false;

  return true;
}

/**
 * Validates a password and returns strength assessment with requirement details.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noCommonPatterns: false,
  };

  if (!password || typeof password !== 'string') {
    return { valid: false, strength: 'weak', score: 0, requirements };
  }

  requirements.minLength = password.length >= 8;
  requirements.hasUppercase = /[A-Z]/.test(password);
  requirements.hasLowercase = /[a-z]/.test(password);
  requirements.hasNumber = /[0-9]/.test(password);
  requirements.hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  requirements.noCommonPatterns = !COMMON_PASSWORDS.some(
    (p) => password.toLowerCase().includes(p)
  );

  // Scoring
  let score = 0;
  if (requirements.minLength) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (requirements.hasUppercase) score += 1;
  if (requirements.hasLowercase) score += 1;
  if (requirements.hasNumber) score += 1;
  if (requirements.hasSpecialChar) score += 2;
  if (requirements.noCommonPatterns) score += 1;
  // Penalise short passwords
  if (password.length < 8) score = 0;

  let strength: PasswordValidationResult['strength'];
  if (score <= 3) {
    strength = 'weak';
  } else if (score <= 6) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  const allCriticalMet =
    requirements.minLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumber;

  return {
    valid: allCriticalMet && requirements.noCommonPatterns,
    strength,
    score,
    requirements,
  };
}

/**
 * Validates a date range ensuring 'from' is before 'to' and the range is reasonable.
 */
export function validateDateRange(from: Date, to: Date): boolean {
  if (!(from instanceof Date) || !(to instanceof Date)) return false;
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return false;
  if (from >= to) return false;

  // Maximum range: 5 years
  const maxRangeMs = 5 * 365 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxRangeMs) return false;

  // From date should not be before year 2000 (banking system inception)
  if (from.getFullYear() < 2000) return false;

  // To date should not be more than 1 year in the future
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 1);
  if (to > maxFuture) return false;

  return true;
}

/**
 * Asynchronously validates a CSV file for bulk transaction uploads.
 */
export async function validateCSVUpload(file: File): Promise<CSVValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    return { valid: false, rowCount: 0, errors: ['No file provided.'] };
  }

  // File type check
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
    errors.push(`File type "${file.type}" is not allowed. Please upload a CSV file.`);
  }

  // File size check
  const maxSizeBytes = CSV_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(
      `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the maximum allowed size of ${CSV_MAX_FILE_SIZE_MB} MB.`
    );
  }

  if (errors.length > 0) {
    return { valid: false, rowCount: 0, errors };
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return { valid: false, rowCount: 0, errors: ['Failed to read file content.'] };
  }

  if (!content || content.trim().length === 0) {
    return { valid: false, rowCount: 0, errors: ['CSV file is empty.'] };
  }

  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      valid: false,
      rowCount: 0,
      errors: ['CSV file must contain a header row and at least one data row.'],
    };
  }

  if (lines.length - 1 > CSV_MAX_ROWS) {
    errors.push(
      `CSV contains ${lines.length - 1} data rows which exceeds the maximum of ${CSV_MAX_ROWS} rows per upload.`
    );
  }

  // Parse and validate headers
  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  const missingHeaders = CSV_REQUIRED_HEADERS.filter((h) => !rawHeaders.includes(h));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required CSV headers: ${missingHeaders.join(', ')}.`);
  }

  const dataRows = lines.slice(1);
  let rowCount = 0;
  const rowErrors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const columns = row.split(',').map((c) => c.trim().replace(/"/g, ''));

    if (columns.length !== rawHeaders.length) {
      rowErrors.push(
        `Row ${i + 2}: Expected ${rawHeaders.length} columns but found ${columns.length}.`
      );
      continue;
    }

    const rowData: Record<string, string> = {};
    rawHeaders.forEach((header, idx) => {
      rowData[header] = columns[idx] ?? '';
    });

    // Validate amount
    if (rowData.amount !== undefined) {
      const amount = parseFloat(rowData.amount);
      if (isNaN(amount) || amount <= 0) {
        rowErrors.push(`Row ${i + 2}: Invalid amount "${rowData.amount}".`);
      }
    }

    // Validate currency
    if (rowData.currency) {
      if (!SUPPORTED_CURRENCIES.includes(rowData.currency.toUpperCase() as SupportedCurrency)) {
        rowErrors.push(
          `Row ${i + 2}: Unsupported currency "${rowData.currency}".`
        );
      }
    }

    // Validate IBANs if present
    if (rowData.fromaccount || rowData.fromAccount) {
      const acc = rowData.fromaccount ?? rowData.fromAccount;
      if (acc && acc.length > 5) {
        const ibanCheck = validateIBAN(acc);
        if (!ibanCheck.valid) {
          rowErrors.push(`Row ${i + 2}: Invalid source IBAN - ${ibanCheck.error}`);
        }
      }
    }

    if (rowData.toaccount || rowData.toAccount) {
      const acc = rowData.toaccount ?? rowData.toAccount;
      if (acc && acc.length > 5) {
        const ibanCheck = validateIBAN(acc);
        if (!ibanCheck.valid) {
          rowErrors.push(`Row ${i + 2}: Invalid destination IBAN - ${ibanCheck.error}`);
        }
      }
    }

    rowCount++;

    // Limit error reporting to first 50 errors to avoid overwhelming output
    if (rowErrors.length >= 50) {
      rowErrors.push(`... and potentially more errors. First 50 row errors shown.`);
      break;
    }
  }

  errors.push(...rowErrors);

  if (rowCount > 1000) {
    warnings.push(
      `Large upload detected (${rowCount} rows). Processing may take longer than usual.`
    );
  }

  return {
    valid: errors.length === 0,
    rowCount,
    errors,
    warnings,
    headers: rawHeaders,
  };
}

// ============================================================
// Helper / Utility Exports
// ============================================================

/**
 * Returns human-readable description of phone number format for a CEMAC country.
 */
export function getPhoneFormat(country: string): string {
  const config = PHONE_PATTERNS[country.toUpperCase()];
  return config ? config.description : 'Unknown country phone format.';
}

/**
 * Formats an IBAN with spaces every 4 characters for display purposes.
 */
export function formatIBANDisplay(iban: string): string {
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
}

/**
 * Sanitises a string for safe use in XML context.
 */
export function sanitiseForXML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns all CEMAC country info.
 */
export function getCEMACCountries() {
  return Object.entries(CEMAC_COUNTRIES).map(([code, info]) => ({
    code,
    ...info,
  }));
}

export default {
  validateIBAN,
  validateBIC,
  validateAmount,
  validateXMLMessage,
  validateTransaction,
  validateAccountNumber,
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validateDateRange,
  validateCSVUpload,
  formatIBANDisplay,
  sanitiseForXML,
  getCEMACCountries,
  getPhoneFormat,
  CEMAC_COUNTRIES,
  CEMAC_COUNTRY_CODES,
  SUPPORTED_CURRENCIES,
};
