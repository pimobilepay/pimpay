/**
 * lib/crypto.ts
 * [FIX V20] — Chiffrement / déchiffrement AES-256-CBC des clés privées.
 *
 * Format stocké en DB : "<ivHex(32 chars)>:<encryptedHex>"
 * Variable d'environnement requise : ENCRYPTION_KEY (exactement 32 caractères UTF-8)
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

const ALGORITHM  = 'aes-256-cbc';
const IV_LENGTH  = 16; // 16 octets → 32 hex chars (compatible regex /^[a-f0-9]{32}:/)
const IV_HEX_LEN = IV_LENGTH * 2; // 32

// ─── Clé ────────────────────────────────────────────────────────────────────

/**
 * Lit et valide ENCRYPTION_KEY depuis l'environnement.
 * Lance une exception explicite si absente ou de mauvaise longueur.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      '[CRYPTO] ENCRYPTION_KEY est manquante. ' +
      "Définissez une clé AES-256 de 32 caractères dans vos variables d'environnement."
    );
  }

  const buf = Buffer.from(key, 'utf8');

  if (buf.length !== 32) {
    throw new Error(
      `[CRYPTO] ENCRYPTION_KEY doit faire exactement 32 octets UTF-8 (AES-256). ` +
      `Longueur actuelle : ${buf.length}`
    );
  }

  return buf;
}

// ─── Chiffrement ─────────────────────────────────────────────────────────────

/**
 * Chiffre une chaîne en clair.
 * @returns "<ivHex(32)>:<encryptedHex>" ou "" si text est vide.
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key    = getEncryptionKey();
  const iv     = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── Déchiffrement ───────────────────────────────────────────────────────────

/**
 * Déchiffre une valeur au format "<ivHex(32)>:<encryptedHex>".
 * @throws si le format est invalide, la clé corrompue, ou le déchiffrement échoue.
 */
export function decrypt(text: string): string {
  if (!text) throw new Error('[CRYPTO] Valeur vide — rien à déchiffrer.');

  if (!text.includes(':')) {
    throw new Error('[CRYPTO] Format invalide — attendu: ivHex:encryptedHex');
  }

  const key = getEncryptionKey();

  try {
    const colonIdx     = text.indexOf(':');
    const ivHex        = text.slice(0, colonIdx);
    const encryptedHex = text.slice(colonIdx + 1);

    if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
      throw new Error(
        `IV invalide (${ivHex.length} chars hex attendus: ${IV_HEX_LEN}). ` +
        'La clé est peut-être corrompue ou chiffrée avec un autre algorithme.'
      );
    }

    if (!encryptedHex || !/^[a-f0-9]+$/i.test(encryptedHex)) {
      throw new Error('Payload chiffré absent ou invalide.');
    }

    const iv        = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher  = createDecipheriv(ALGORITHM, key, iv);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');

  } catch (error: any) {
    throw new Error(`[CRYPTO] Décryption échouée: ${error.message}`);
  }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/**
 * Vérifie si une valeur est déjà au format chiffré "<ivHex(32)>:<encryptedHex>".
 * Utilisé par le script de migration pour éviter un double-chiffrement.
 */
export function isEncrypted(value: string): boolean {
  return /^[a-f0-9]{32}:/i.test(value);
}

/**
 * Comparaison sécurisée contre les timing attacks.
 * À utiliser pour comparer des secrets (tokens, hashes…).
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
