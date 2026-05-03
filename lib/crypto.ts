import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * ✅ SÉCURITÉ: Pas de fallback — la clé DOIT être définie en environnement.
 * Si ENCRYPTION_KEY est absent, l'application refuse de démarrer.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      '[CRYPTO] ENCRYPTION_KEY est manquante. ' +
      'Définissez une clé AES-256 de 32 caractères dans vos variables d\'environnement.'
    );
  }

  if (key.length !== 32) {
    throw new Error(
      `[CRYPTO] ENCRYPTION_KEY doit faire exactement 32 caractères (AES-256). ` +
      `Longueur actuelle : ${key.length}`
    );
  }

  return Buffer.from(key);
}

export function encrypt(text: string): string {
  if (!text) return '';

  const secretKey = getEncryptionKey(); // ← Lance une exception si absent
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, secretKey, iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) {
    throw new Error('Texte chiffré invalide: format iv:data attendu');
  }

  const secretKey = getEncryptionKey(); // ← Lance une exception si absent

  try {
    const textParts = text.split(':');
    if (textParts.length < 2) {
      throw new Error('Texte chiffré invalide: IV manquant');
    }

    const ivHex = textParts.shift()!;
    const encryptedHex = textParts.join(':');

    if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
      throw new Error(
        `Clé corrompue: IV invalide (${ivHex.length} chars). Redéfinissez votre clé.`
      );
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, secretKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error: any) {
    throw new Error(`Décryption échouée: ${error.message}`);
  }
}
