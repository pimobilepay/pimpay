/**
 * lib/encryption.ts
 * [FIX V24] Secure key derivation + rotation for private keys
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_VERSION = 'v2'; // Upgraded from v1 for key rotation
const SALT_LENGTH = 32;

/**
 * [FIX V24] Derive encryption key from master key using scrypt
 * More secure than direct buffer conversion
 */
function deriveEncryptionKey(masterKey: string, salt: Buffer): Buffer {
  try {
    // scrypt is slow by design (protects against brute force)
    // N=32768 (2^15), r=8, p=1 = OWASP recommendation
    return scryptSync(masterKey, salt, 32, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`[CRYPTO] Key derivation failed: ${error}`);
  }
}

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('[CRYPTO] ENCRYPTION_KEY manquante');
  if (key.length < 32) throw new Error('[CRYPTO] ENCRYPTION_KEY trop court (min 32 chars)');
  return key;
}

/**
 * [FIX V24] Encrypt sensitive data (private keys, PIN, etc)
 * Format: v2:saltHex:ivHex:authTagHex:encryptedHex
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const masterKey = getMasterKey();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveEncryptionKey(masterKey, salt);
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return `${KEY_VERSION}:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * [FIX V24] Decrypt with key derivation
 */
export function decrypt(text: string): string {
  if (!text) throw new Error('[CRYPTO] Valeur vide');
  
  // Handle new GCM format with key derivation (v2:salt:iv:authTag:data)
  if (text.startsWith('v2:')) {
    const parts = text.split(':');
    if (parts.length !== 5) throw new Error('[CRYPTO] Format GCM v2 invalide');
    
    const masterKey = getMasterKey();
    const salt = Buffer.from(parts[1], 'hex');
    const key = deriveEncryptionKey(masterKey, salt);
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encrypted = Buffer.from(parts[4], 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    try {
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (e: any) {
      throw new Error(`[CRYPTO] Décryption v2 échouée: ${e.message}`);
    }
  }
  
  // Fallback: handle old GCM format without salt (v1:iv:authTag:data)
  if (text.startsWith('v1:')) {
    return decryptLegacyV1(text);
  }
  
  // Legacy CBC format (ivHex:encryptedHex)
  return decryptLegacyCBC(text);
}

/**
 * Decrypt legacy v1 format (no key derivation)
 */
function decryptLegacyV1(text: string): string {
  const parts = text.split(':');
  if (parts.length !== 4) throw new Error('[CRYPTO] Format v1 invalide');
  
  const masterKey = getMasterKey();
  const key = Buffer.from(masterKey, 'utf8');
  if (key.length !== 32) throw new Error('[CRYPTO] ENCRYPTION_KEY must be 32 bytes');
  
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = Buffer.from(parts[3], 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e: any) {
    throw new Error(`[CRYPTO] Décryption v1 échouée: ${e.message}`);
  }
}

/**
 * Decrypt legacy CBC format
 */
function decryptLegacyCBC(text: string): string {
  if (!text.includes(':')) {
    throw new Error('[CRYPTO] Format invalide');
  }

  const masterKey = getMasterKey();
  const key = Buffer.from(masterKey, 'utf8');

  try {
    const colonIdx = text.indexOf(':');
    const ivHex = text.slice(0, colonIdx);
    const encryptedHex = text.slice(colonIdx + 1);

    if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
      throw new Error('[CRYPTO] IV invalide');
    }

    if (!encryptedHex || !/^[a-f0-9]+$/i.test(encryptedHex)) {
      throw new Error('[CRYPTO] Payload chiffré invalide');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const { createDecipheriv: legacyDecipher } = require('crypto');
    const decipher = legacyDecipher('aes-256-cbc', key, iv);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error: any) {
    throw new Error(`[CRYPTO] Décryption CBC échouée: ${error.message}`);
  }
}

/**
 * Check if value is encrypted with new format
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('v1:') || value.startsWith('v2:');
}

/**
 * Check if value needs migration to v2
 */
export function needsMigrationToV2(value: string): boolean {
  return value.startsWith('v1:');
}

/**
 * Migrate value from v1 to v2 encryption
 */
export function migrateEncryption(encryptedValue: string): string {
  try {
    const decrypted = decrypt(encryptedValue);
    return encrypt(decrypted); // Re-encrypt with v2 (key derivation + salt)
  } catch (error) {
    console.error('[CRYPTO] Migration failed:', error);
    return encryptedValue; // Return original if migration fails
  }
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
