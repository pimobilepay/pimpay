/**
 * GET  /api/savings — Vue d'ensemble : comptes épargne, coffres, totaux, portefeuilles.
 * POST /api/savings — Ouvre un nouveau compte épargne.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAccountNumber,
  resolveInterestRate,
  serializeSavings,
  serializeVault,
  round2,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseCurrency,
  parseSavingsType,
  parseName,
  parseOptionalTarget,
  savingsErrorResponse,
  FIXED_TERMS_MONTHS,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const now = new Date();

    const [accounts, vaults, wallets] = await Promise.all([
      prisma.savingsAccount.findMany({
        where: { userId, status: { not: "CLOSED" } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vault.findMany({
        where: { userId, status: { not: "CLOSED" } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.wallet.findMany({
        where: { userId, type: "FIAT" },
        select: { currency: true, balance: true },
      }),
    ]);

    const serializedAccounts = accounts.map((a) => serializeSavings(a));
    const serializedVaults = vaults.map((v) => serializeVault(v, now));

    // Totaux par devise : les produits peuvent être libellés dans plusieurs
    // devises, additionner les montants bruts n'aurait aucun sens.
    const totalsByCurrency: Record<string, { saved: number; interest: number }> = {};
    const accumulate = (currency: string, amount: number, interest: number) => {
      const bucket = (totalsByCurrency[currency] ??= { saved: 0, interest: 0 });
      bucket.saved = round2(bucket.saved + amount);
      bucket.interest = round2(bucket.interest + interest);
    };
    for (const a of serializedAccounts) accumulate(a.currency, a.balance, a.totalInterest);
    for (const v of serializedVaults) accumulate(v.currency, v.amount, v.totalInterest);

    return NextResponse.json({
      accounts: serializedAccounts,
      vaults: serializedVaults,
      wallets: wallets.map((w) => ({ currency: w.currency, balance: round2(w.balance) })),
      totalsByCurrency,
    });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await readJson(req);

    const type = parseSavingsType(body.type);
    const currency = parseCurrency(body.currency);
    const name = parseName(body.name, "Compte épargne");
    const targetAmount = parseOptionalTarget(body.targetAmount);

    // Un dépôt à terme est immobilisé : la durée est obligatoire et bornée.
    let maturityDate: Date | null = null;
    if (type === "FIXED_DEPOSIT") {
      const months = Number(body.termMonths);
      if (!FIXED_TERMS_MONTHS.includes(months as (typeof FIXED_TERMS_MONTHS)[number])) {
        throw new SavingsError(
          `Durée invalide pour un dépôt à terme. Durées possibles : ${FIXED_TERMS_MONTHS.join(", ")} mois.`
        );
      }
      maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + months);
    }

    // Le versement programmé n'a de sens que pour une épargne récurrente.
    let autoDebitAmount: number | null = null;
    let autoDebitDay: number | null = null;
    if (type === "RECURRING") {
      autoDebitAmount = parseOptionalTarget(body.autoDebitAmount);
      const day = Number(body.autoDebitDay);
      if (autoDebitAmount !== null) {
        if (!Number.isInteger(day) || day < 1 || day > 28) {
          throw new SavingsError("Le jour de prélèvement doit être un entier entre 1 et 28.");
        }
        autoDebitDay = day;
      }
    }

    // Garde-fou anti-prolifération de comptes.
    const openCount = await prisma.savingsAccount.count({
      where: { userId, status: { not: "CLOSED" } },
    });
    if (openCount >= 10) {
      throw new SavingsError("Vous avez atteint la limite de 10 comptes épargne ouverts.");
    }

    const interestRate = await resolveInterestRate(type, currency);

    const account = await prisma.savingsAccount.create({
      data: {
        userId,
        accountNumber: generateAccountNumber(),
        name,
        type,
        currency,
        interestRate,
        targetAmount,
        maturityDate,
        autoDebitAmount,
        autoDebitDay,
        balance: 0,
      },
    });

    return NextResponse.json({ account: serializeSavings(account) }, { status: 201 });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
