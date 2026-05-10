/**
 * scripts/reset-private-keys.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ÉTAPE 1 — Réinitialise toutes les clés privées + adresses crypto en DB.
 *
 * ⚠️  IRRÉVERSIBLE — Sauvegarde ta DB avant d'exécuter.
 *
 * Ce script ne supprime PAS les fonds — il efface seulement les clés stockées.
 * Les utilisateurs recevront de nouvelles adresses à leur prochaine connexion.
 *
 * Usage :
 *   npx tsc --outDir dist scripts/reset-private-keys.ts lib/crypto.ts \
 *     --module commonjs --moduleResolution node --esModuleInterop true \
 *     --skipLibCheck true
 *   node dist/scripts/reset-private-keys.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Champs à nullifier — clés privées + adresses pour forcer la regénération
const KEY_FIELDS = [
  "sidraPrivateKey",
  "usdtPrivateKey",
  "stellarPrivateKey",
  "xrpPrivateKey",
  "solPrivateKey",
  "walletPrivateKey",
] as const;

const ADDRESS_FIELDS = [
  "sidraAddress",
  "usdtAddress",
  "walletAddress",
  "xlmAddress",
  "xrpAddress",
  "solAddress",
] as const;

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   RESET DES CLÉS PRIVÉES → MIGRATION AES-256-GCM    ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ── Compter avant ──────────────────────────────────────────────────────────
  const totalUsers = await prisma.user.count();
  const usersWithKeys = await prisma.user.count({
    where: {
      OR: KEY_FIELDS.map((f) => ({ [f]: { not: null } })),
    },
  });

  console.log(`📊 Utilisateurs total      : ${totalUsers}`);
  console.log(`🔑 Utilisateurs avec clés  : ${usersWithKeys}`);
  console.log();

  if (usersWithKeys === 0) {
    console.log("✅ Aucune clé à réinitialiser. Base déjà propre.");
    await prisma.$disconnect();
    return;
  }

  // ── Confirmation manuelle ──────────────────────────────────────────────────
  console.log("⚠️  Cette opération va NULL-ifier les clés et adresses crypto");
  console.log("    de TOUS les utilisateurs. Les fonds blockchain restent");
  console.log("    accessibles via les anciennes adresses mais les clés");
  console.log("    seront perdues en DB.\n");
  console.log("    Appuyez sur Ctrl+C dans les 5 secondes pour annuler...\n");

  await new Promise((r) => setTimeout(r, 5000));

  // ── Reset en batch de 100 ──────────────────────────────────────────────────
  const nullData: any = {};
  for (const f of KEY_FIELDS) nullData[f] = null;
  for (const f of ADDRESS_FIELDS) nullData[f] = null;

  let processed = 0;
  let errors = 0;
  const BATCH = 100;

  const userIds = await prisma.user.findMany({
    where: { OR: KEY_FIELDS.map((f) => ({ [f]: { not: null } })) },
    select: { id: true },
  });

  console.log(`🚀 Démarrage reset de ${userIds.length} utilisateurs...\n`);

  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH).map((u) => u.id);
    try {
      const result = await prisma.user.updateMany({
        where: { id: { in: batch } },
        data: nullData,
      });
      processed += result.count;
      process.stdout.write(`\r  ✓ ${processed}/${userIds.length} réinitialisés...`);
    } catch (e: any) {
      console.error(`\n❌ Erreur batch ${i / BATCH + 1}: ${e.message}`);
      errors++;
    }
  }

  // ── Supprimer les wallets crypto associés (ils seront recréés) ────────────
  try {
    const deletedWallets = await prisma.wallet.deleteMany({
      where: { type: "CRYPTO" },
    });
    console.log(`\n🗑️  Wallets crypto supprimés : ${deletedWallets.count}`);
  } catch (e: any) {
    console.error(`\n⚠️  Erreur suppression wallets: ${e.message}`);
  }

  console.log(`\n\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  RÉSULTAT                                            ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║  Réinitialisés : ${String(processed).padEnd(34)}║`);
  console.log(`║  Erreurs       : ${String(errors).padEnd(34)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);

  if (errors > 0) {
    console.error("❌ Des erreurs sont survenues. Vérifiez les logs.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("✅ Reset terminé. Les utilisateurs recevront de nouvelles");
  console.log("   clés AES-256-GCM à leur prochaine connexion.\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\n❌ Erreur fatale:", e.message);
  process.exit(1);
});
