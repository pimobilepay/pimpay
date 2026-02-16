import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * PIMPAY - Module de Sécurité et Chiffrement (SMIIC 8:2022)
 * Ce service assure la confidentialité des soldes et des données KYC.
 */

// Note : Dans un environnement réel, cette clé doit être dans un fichier .env (privé)
const ENCRYPTION_KEY = scryptSync(process.env.DB_ENCRYPTION_PASSWORD || 'pimpay-secure-key', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

/**
 * Chiffre une donnée sensible (ex: solde bancaire, numéro de carte)
 */
export const encryptData = (text: string) => {
  const iv = randomBytes(16); // Vecteur d'initialisation unique
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // On retourne l'IV avec le texte pour pouvoir déchiffrer plus tard
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Déchiffre une donnée pour l'affichage (après validation Sharia)
 */
export const decryptData = (encryptedText: string) => {
  const [ivHex, dataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(dataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Masquage des données à l'écran (UI)
 * Répond à la recommandation sur la confidentialité visuelle.
 */
export const maskSensitiveInfo = (data: string, visibleCount: number = 4) => {
  return data.slice(-visibleCount).padStart(data.length, '*');
};
