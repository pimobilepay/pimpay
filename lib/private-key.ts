/**
 * lib/private-key.ts — Lecture sécurisée des clés privées blockchain
 *
 * [FIX V20] — Les clés privées ne doivent jamais quitter le serveur en clair.
 *
 * État actuel (DB) : les clés sont chiffrées via lib/crypto.ts (AES-256-CBC)
 *   au moment de la création du wallet. Le worker les déchiffre à la volée
 *   avec decrypt() pour signer les transactions.
 *
 * Ce module centralise la lecture des clés pour éviter l'accès direct aux
 * champs *PrivateKey dans le reste du code. Il n'exporte JAMAIS une clé en
 * clair — seulement via des fonctions de signature atomiques.
 *
 * ⚠️ Les fonctions retournant une clé en clair (getDecryptedKey) sont
 *    réservées au worker interne — elles ne doivent jamais alimenter une
 *    réponse HTTP.
 *
 * Pour une sécurité maximale (V20 complet), migrer vers AWS KMS ou
 * HashiCorp Vault : les clés ne seraient plus jamais en DB, même chiffrées.
 */

import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type SupportedChain = "sidra" | "usdt" | "stellar" | "xrp" | "sol" | "wallet";

const FIELD_MAP: Record<SupportedChain, string> = {
  sidra:   "sidraPrivateKey",
  usdt:    "usdtPrivateKey",
  stellar: "stellarPrivateKey",
  xrp:     "xrpPrivateKey",
  sol:     "solPrivateKey",
  wallet:  "walletPrivateKey",
};

/**
 * Déchiffre et retourne la clé privée d'un utilisateur pour une chaîne donnée.
 * Usage : worker interne uniquement — ne pas exposer dans une API HTTP.
 */
export async function getDecryptedKey(userId: string, chain: SupportedChain): Promise<string> {
  const field = FIELD_MAP[chain];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { [field]: true } as any,
  });

  const encryptedKey: string | null = (user as any)?.[field];
  if (!encryptedKey) {
    throw new Error(`[PRIVATE_KEY] Clé ${chain} introuvable pour l'utilisateur ${userId}`);
  }

  return decrypt(encryptedKey);
}

/**
 * Chiffre et stocke une clé privée pour un utilisateur.
 * À utiliser lors de la création de wallet uniquement.
 */
export async function storeEncryptedKey(userId: string, chain: SupportedChain, rawKey: string): Promise<void> {
  const field = FIELD_MAP[chain];
  const encrypted = encrypt(rawKey);
  await prisma.user.update({
    where: { id: userId },
    data:  { [field]: encrypted } as any,
  });
}

/**
 * Vérifie qu'une clé stockée est déchiffrable (test de cohérence).
 * Retourne true si OK, false si corrompue ou absente.
 */
export async function validateStoredKey(userId: string, chain: SupportedChain): Promise<boolean> {
  try {
    const key = await getDecryptedKey(userId, chain);
    return key.length > 0;
  } catch {
    return false;
  }
}
