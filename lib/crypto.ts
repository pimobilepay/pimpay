import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      '[PIMPAY] ENCRYPTION_KEY manquante ou trop courte (minimum 32 caractères). ' +
      'Définissez cette variable dans votre fichier .env'
    );
  }
  return Buffer.from(key.slice(0, 32));
}

export function encrypt(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) {
    throw new Error('Texte chiffré invalide: format iv:data attendu');
  }
  const key = getEncryptionKey();
  const textParts = text.split(':');
  const ivHex = textParts.shift()!;
  const encryptedHex = textParts.join(':');

  if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
    throw new Error(`Clé corrompue: IV invalide (${ivHex.length} chars).`);
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}
