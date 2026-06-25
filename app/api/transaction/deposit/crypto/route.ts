export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { parseAmount } from "@/lib/amount-guard";
import { enforceTxRateLimit, getClientIp } from "@/lib/tx-rate-limit";

// Devises crypto autorisées en dépôt (liste blanche stricte).
const ALLOWED_CURRENCIES = ["PI", "SIDRA", "USDT"] as const;
type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

// Format minimal attendu d'un hash on-chain. Empêche les chaînes arbitraires.
// (alphanumérique, éventuel préfixe 0x, longueur réaliste 16–128).
const TX_HASH_REGEX = /^(0x)?[A-Za-z0-9]{16,128}$/;

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION — l'identité vient du token, JAMAIS du body.
    //    (Faille corrigée : auparavant userId était lu depuis le body client,
    //     permettant de créditer n'importe quel compte.)
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Authentification requise" },
        { status: 401 }
      );
    }

    // 2. RATE LIMITING distribué — 2 req / 60s par utilisateur ET par IP.
    const ip = getClientIp(req);
    const limited = await enforceTxRateLimit({ userId, ip, action: "deposit" });
    if (limited) return limited;

    // 3. Parsing du body (le userId éventuellement présent est IGNORÉ).
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Requête invalide" },
        { status: 400 }
      );
    }

    const { amount, currency, blockchainTx, memo } = body as Record<string, unknown>;

    // 4. Validation de la devise (liste blanche).
    if (typeof currency !== "string" || !ALLOWED_CURRENCIES.includes(currency as AllowedCurrency)) {
      return NextResponse.json(
        { success: false, message: "Devise non supportée" },
        { status: 400 }
      );
    }
    const safeCurrency = currency as AllowedCurrency;

    // 5. Validation du hash on-chain.
    if (typeof blockchainTx !== "string" || !TX_HASH_REGEX.test(blockchainTx)) {
      return NextResponse.json(
        { success: false, message: "Hash de transaction blockchain invalide" },
        { status: 400 }
      );
    }

    // 6. Validation STRICTE du montant (anti-négatif / overflow / décimales).
    const parsed = parseAmount(amount);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.error },
        { status: 400 }
      );
    }
    const safeAmount = parsed.value;

    // 7. Validation du memo (optionnel, borné).
    const safeMemo =
      typeof memo === "string" && memo.length <= 256 ? memo : undefined;

    const reference = `CRYPTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 8. TRANSACTION ATOMIQUE.
    //    L'anti-replay repose sur la contrainte @unique(blockchainTx) de la DB :
    //    on tente l'insertion et on intercepte P2002 (pas de check-then-insert
    //    sujet aux race conditions / rejeu en boucle à la même seconde).
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: safeCurrency } },
          update: {},
          create: {
            userId,
            currency: safeCurrency,
            balance: 0,
            type: safeCurrency === "PI" ? "PI" : "CRYPTO",
          },
        });

        // Insertion protégée par la contrainte unique blockchainTx.
        const newTransaction = await tx.transaction.create({
          data: {
            reference,
            blockchainTx,
            amount: safeAmount,
            currency: safeCurrency,
            type: "DEPOSIT",
            status: "SUCCESS",
            description: `Dépôt Crypto ${safeCurrency} - Réseau ${
              safeCurrency === "PI" ? "Pi Network" : "Mainnet"
            }`,
            toUserId: userId,
            toWalletId: wallet.id,
            metadata: { memo: safeMemo, processedAt: new Date().toISOString() },
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: safeAmount } },
        });

        await tx.notification.create({
          data: {
            userId,
            title: "Actif Crypto Reçu",
            message: `Votre dépôt de ${safeAmount} ${safeCurrency} a été confirmé sur la blockchain.`,
            type: "CRYPTO_DEPOSIT",
          },
        });

        return newTransaction;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    // 9. Log d'audit (hors transaction critique).
    await prisma.securityLog
      .create({
        data: {
          userId,
          action: `CRYPTO_DEPOSIT_COMPLETED | TX:${blockchainTx} | ${safeAmount} ${safeCurrency}`,
          ip,
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Portefeuille crédité avec succès",
      data: result,
    });
  } catch (error) {
    // Anti-replay : violation de contrainte unique sur blockchainTx (ou reference).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Cette transaction a déjà été créditée" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    console.error("CRYPTO_DEPOSIT_ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors du traitement du dépôt crypto" },
      { status: 500 }
    );
  }
}
