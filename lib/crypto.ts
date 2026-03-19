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
    
    // Valider le format de l'IV (doit être 32 caractères hex = 16 bytes)
    if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
      throw new Error(`IV invalide: ${ivHex.length} caractères, 32 attendus`);
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error(`IV length invalide: ${iv.length}, ${IV_LENGTH} attendu`);
    }
    
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error: any) {
    throw new Error(`Décryption échouée: ${error.message}`);
  }
}
