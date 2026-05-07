/**
 * scripts/migrate-encrypt-keys.ts
 * [FIX V20] — Chiffre toutes les clés privées en DB encore stockées en clair.
 *
 * Usage (une seule fois, avant mise en production) :
 *   ENCRYPTION_KEY=<32_chars> npx ts-node scripts/migrate-encrypt-keys.ts
 *
 * - Ne rechiffre pas une clé déjà au format "ivHex:encryptedHex"
 * - Journalise sans exposer les valeurs des clés
 * - S'arrête avec exit(1) si des erreurs surviennent
 */
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../lib/crypto";

const prisma = new PrismaClient();

const FIELDS = [
  "sidraPrivateKey","usdtPrivateKey","stellarPrivateKey",
  "xrpPrivateKey","solPrivateKey","walletPrivateKey",
] as const;

const isEncrypted = (v: string) => /^[a-f0-9]{32}:/i.test(v);

async function main() {
  console.log("[MIGRATE] Démarrage — ENCRYPTION_KEY présente:", !!process.env.ENCRYPTION_KEY);
  const users = await prisma.user.findMany({ select: { id:true, sidraPrivateKey:true, usdtPrivateKey:true, stellarPrivateKey:true, xrpPrivateKey:true, solPrivateKey:true, walletPrivateKey:true } });
  let migrated = 0, skipped = 0, errors = 0;
  for (const user of users) {
    const updates: any = {};
    for (const field of FIELDS) {
      const val = (user as any)[field] as string|null;
      if (!val) continue;
      if (isEncrypted(val)) { skipped++; continue; }
      try { updates[field] = encrypt(val); migrated++; }
      catch { console.error(`[MIGRATE] Erreur: user=${user.id} field=${field}`); errors++; }
    }
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where:{id:user.id}, data:updates });
      console.log(`[MIGRATE] user=${user.id} — ${Object.keys(updates).length} clé(s) chiffrée(s)`);
    }
  }
  console.log(`\n[MIGRATE] migrées=${migrated} déjà_chiffrées=${skipped} erreurs=${errors}`);
  if (errors > 0) { await prisma.$disconnect(); process.exit(1); }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
