/**
 * GET  /api/vaults — Liste les coffres-forts de l'utilisateur.
 * POST /api/vaults — Crée un coffre avec une date de déverrouillage.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeVault,
  resolveInterestRate,
  DEFAULT_PENALTY_RATE,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseCurrency,
  parseName,
  parseOptionalTarget,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

/** Bornes du verrou temporel : au moins 7 jours, au plus 5 ans. */
const MIN_LOCK_DAYS = 7;
const MAX_LOCK_DAYS = 1825;

export async function GET() {
  try {
    const userId = await requireUserId();
    const now = new Date();

    const vaults = await prisma.vault.findMany({
      where: { userId, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ vaults: vaults.map((v) => serializeVault(v, now)) });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await readJson(req);

    const name = parseName(body.name, "Coffre-fort");
    const currency = parseCurrency(body.currency);
    const targetAmount = parseOptionalTarget(body.targetAmount);

    const lockDays = Number(body.lockDays);
    if (!Number.isInteger(lockDays) || lockDays < MIN_LOCK_DAYS || lockDays > MAX_LOCK_DAYS) {
      throw new SavingsError(
        `La durée de blocage doit être un nombre entier de jours entre ${MIN_LOCK_DAYS} et ${MAX_LOCK_DAYS}.`
      );
    }
    const lockUntil = new Date(Date.now() + lockDays * 86_400_000);

    const openCount = await prisma.vault.count({
      where: { userId, status: { not: "CLOSED" } },
    });
    if (openCount >= 10) {
      throw new SavingsError("Vous avez atteint la limite de 10 coffres-forts ouverts.");
    }

    // Un coffre est immobilisé plus longtemps qu'une épargne classique : il est
    // rémunéré au barème du dépôt à terme.
    const interestRate = await resolveInterestRate("FIXED_DEPOSIT", currency);

    const vault = await prisma.vault.create({
      data: {
        userId,
        name,
        currency,
        targetAmount,
        lockUntil,
        interestRate,
        penaltyRate: DEFAULT_PENALTY_RATE,
        amount: 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ vault: serializeVault(vault) }, { status: 201 });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
