/**
 * Migration: Rename wallet currency "SIDRA" -> "SDA" (keeping type "SIDRA")
 * 
 * This fixes the confusion where currency and type were both "SIDRA".
 * Convention: currency = "SDA", type = "SIDRA"
 * 
 * Handles potential unique constraint conflicts where a user already has both
 * a "SDA" and "SIDRA" wallet by merging balances.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[FIX] Starting SIDRA -> SDA currency migration...");

  // Find all wallets with currency "SIDRA"
  const sidraWallets = await prisma.wallet.findMany({
    where: { currency: "SIDRA" },
  });

  console.log(`[FIX] Found ${sidraWallets.length} wallet(s) with currency "SIDRA"`);

  let updated = 0;
  let merged = 0;
  let errors = 0;

  for (const wallet of sidraWallets) {
    try {
      // Check if user already has an "SDA" wallet
      const existingSda = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: wallet.userId, currency: "SDA" } },
      });

      if (existingSda) {
        // User has both - merge balances into SDA wallet, delete SIDRA one
        const mergedBalance = Math.max(existingSda.balance, wallet.balance);
        await prisma.wallet.update({
          where: { id: existingSda.id },
          data: { balance: mergedBalance, type: "SIDRA" },
        });
        await prisma.wallet.delete({ where: { id: wallet.id } });
        merged++;
        console.log(`[FIX] Merged SIDRA wallet for user ${wallet.userId} (balance: ${mergedBalance})`);
      } else {
        // Simply rename currency from SIDRA to SDA
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { currency: "SDA" },
        });
        updated++;
        console.log(`[FIX] Renamed SIDRA -> SDA for user ${wallet.userId}`);
      }
    } catch (err: any) {
      errors++;
      console.error(`[FIX] Error processing wallet ${wallet.id}:`, err.message);
    }
  }

  console.log(`[FIX] Migration complete: ${updated} renamed, ${merged} merged, ${errors} errors`);
}

main()
  .catch((e) => {
    console.error("[FIX] Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
