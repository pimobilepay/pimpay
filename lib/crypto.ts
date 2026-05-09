/**
 * lib/crypto.ts
 * [FIX V21] — AES-256-GCM avec auth. Protège contre padding oracle.
 * Format stocké : "v1:ivHex:authTagHex:encryptedHex"
 * ENCRYPTION_KEY : 32 caractères UTF-8 dans Vercel Env Vars
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommande 12 bytes
const KEY_VERSION = 'v1'; // Pour rotation future

// Legacy CBC constants for migration
const LEGACY_ALGORITHM = 'aes-256-cbc';
const LEGACY_IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('[CRYPTO] ENCRYPTION_KEY manquante');
  const buf = Buffer.from(key, 'utf8');
  if (buf.length !== 32) throw new Error(`[CRYPTO] ENCRYPTION_KEY doit faire 32 bytes. Actuel: ${buf.length}`);
  return buf;
}

export function encrypt(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
  if (!text) throw new Error('[CRYPTO] Valeur vide');
  
  // Handle new GCM format (v1:iv:authTag:data)
  if (text.startsWith('v1:')) {
    const parts = text.split(':');
    if (parts.length !== 4) throw new Error('[CRYPTO] Format GCM invalide. Attendu v1:iv:authTag:data');
    
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    try {
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (e: any) {
      throw new Error(`[CRYPTO] Décryption GCM échouée: authTag invalide ou clé corrompue`);
    }
  }
  
  // Handle legacy CBC format (ivHex:encryptedHex) for backward compatibility
  return decryptLegacyCBC(text);
}

/**
 * Decrypt legacy CBC format (ivHex:encryptedHex)
 * Used for migration and backward compatibility
 */
export function decryptLegacyCBC(text: string): string {
  if (!text) throw new Error('[CRYPTO] Valeur vide');
  if (!text.includes(':')) {
    throw new Error('[CRYPTO] Format invalide — attendu: ivHex:encryptedHex');
  }

  const key = getEncryptionKey();

  try {
    const colonIdx = text.indexOf(':');
    const ivHex = text.slice(0, colonIdx);
    const encryptedHex = text.slice(colonIdx + 1);

    if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
      throw new Error(
        `IV invalide (${ivHex.length} chars hex attendus: 32). ` +
        'La clé est peut-être corrompue ou chiffrée avec un autre algorithme.'
      );
    }

    if (!encryptedHex || !/^[a-f0-9]+$/i.test(encryptedHex)) {
      throw new Error('Payload chiffré absent ou invalide.');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(LEGACY_ALGORITHM, key, iv);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');

  } catch (error: any) {
    throw new Error(`[CRYPTO] Décryption CBC échouée: ${error.message}`);
  }
}

/**
 * Check if value is encrypted with new GCM format
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('v1:');
}

/**
 * Check if value is encrypted with legacy CBC format
 */
export function isLegacyEncrypted(value: string): boolean {
  return /^[a-f0-9]{32}:/i.test(value) && !value.startsWith('v1:');
}

/**
 * Check if value needs migration from CBC to GCM
 */
export function needsMigration(value: string): boolean {
  return isLegacyEncrypted(value);
}

export function safeCompare(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
