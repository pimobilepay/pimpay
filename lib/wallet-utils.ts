import crypto from "crypto";

/**
 * Génère une adresse de portefeuille simulée au format Pi Network (Stellar)
 * Exemple: GDUO7K...X4P2
 */
export function generateWalletAddress(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // Base32 alphabet
  const prefix = "G";
  let address = prefix;

  // Génère 55 caractères aléatoires pour atteindre la longueur standard de 56
  const randomBytes = crypto.randomBytes(55);
  for (let i = 0; i < 55; i++) {
    address += chars[randomBytes[i] % chars.length];
  }

  return address;
}
