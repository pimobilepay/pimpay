import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default_key_must_be_32_chars_long';
const IV_LENGTH = 16; // Pour AES, toujours 16

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // On stocke l'IV avec le texte chiffré pour pouvoir déchiffrer plus tard
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) {
    throw new Error('Texte chiffré invalide: format iv:data attendu');
  }
  
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) {
      throw new Error('Texte chiffré invalide: IV manquant');
    }
    
    const ivHex = textParts.shift()!;
    const encryptedHex = textParts.join(':');
    
    // Support pour deux formats d'IV: 16 bytes (32 hex chars) ou 12 bytes (24 hex chars) pour backward compatibility
    const isValidIV = /^[a-f0-9]{24}$/i.test(ivHex) || /^[a-f0-9]{32}$/i.test(ivHex);
    if (!isValidIV) {
      throw new Error(`IV invalide: ${ivHex.length} caractères, 24 ou 32 attendus`);
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    
    // Pour les anciennes clés avec IV de 12 bytes, on doit utiliser le bon algo/IV
    // AES-256-CBC doit avoir exactement 16 bytes IV, donc on pad les 12 bytes avec des zéros
    let finalIv = iv;
    if (iv.length === 12) {
      // Padding avec des zéros pour atteindre 16 bytes
      finalIv = Buffer.alloc(16);
      iv.copy(finalIv);
    }
    
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), finalIv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error: any) {
    throw new Error(`Décryption échouée: ${error.message}`);
  }
}
