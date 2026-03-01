export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  TransactionStatus,
  TransactionType,
  WalletType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * ✅ FIX : Lecture unique via req.text() puis parsing manuel
 * Évite le double-read du stream (json() + text()) qui causait le 400
 */
async function parseRequestBalance(req: Request): Promise<number | null> {
  let rawText: string = "";

  try {
    // On lit le body UNE SEULE FOIS en texte brut
    rawText = await req.text();
  } catch (err) {
    console.error("[parseRequestBalance] Impossible de lire le body :", err);
    return null;
  }

  if (!rawText || !rawText.trim()) {
    console.error("[parseRequestBalance] Body vide reçu");
    return null;
  }

  // --- Tentative JSON (cas principal) ---
  try {
    const body = JSON.parse(rawText);
    const val = body?.realBlockchainBalance;

    if (val === undefined || val === null) {
      console.error(
        "[parseRequestBalance] Champ 'realBlockchainBalance' absent ou null dans :",
        body
      );
      return null;
    }

    // ✅ FIX : Gestion string ET number (ex: "10.5" ou 10.5)
    const num =
      typeof val === "number"
        ? val
        : parseFloat(String(val).replace(",", "."));

    if (isNaN(num)) {
      console.error("[parseRequestBalance] Valeur non numérique :", val);
      return null;
    }

    return num;
  } catch {
    // Pas du JSON, on essaie URL-encoded
  }

  // --- Tentative URL-encoded (fallback) ---
  try {
    const params = new URLSearchParams(rawText);
    const val = params.get("realBlockchainBalance");

    if (val === null) {
      console.error(
        "[parseRequestBalance] Champ absent dans les params URL-encoded"
      );
      return null;
    }

    const num = parseFloat(val.replace(",", "."));
    return isNaN(num) ? null : num;
  } catch (err) {
    console.error("[parseRequestBalance] Échec fallback URL-encoded :", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // ─────────────────────────────────────────────
    // 1. LECTURE DU BODY EN PREMIER (avant cookies)
    // ✅ FIX CRITIQUE : On extrait le body AVANT tout appel async Next.js
    // pour garantir que le stream n'est pas affecté
    // ─────────────────────────────────────────────
    const blockchainBalance = await parseRequestBalance(req);

    if (blockchainBalance === null || isNaN(blockchainBalance)) {
      return NextResponse.json(
        { error: "Donnée 'realBlockchainBalance' invalide ou manquante" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 2. AUTHENTIFICATION (après lecture du body)
    // ─────────────────────────────────────────────
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ||
      cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    // Support des deux formats de payload possibles
    const userId = (payload.id || payload.userId) as string;

    if (!userId) {
      return NextResponse.json(
        { error: "Utilisateur non identifié" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────
    // 3. TRANSACTION ATOMIQUE
    // ─────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { type: WalletType.SIDRA },
          create: {
            userId,
            currency: "SDA",
            balance: 0,
            type: WalletType.SIDRA,
          },
        });

        const currentBalance = wallet.balance;
        const diff = Number(
          (blockchainBalance - currentBalance).toFixed(8)
        );

        // Déjà synchronisé
        if (Math.abs(diff) < 0.00000001) {
          return {
            updated: false,
            total: currentBalance,
            reason: "ALREADY_SYNC",
          };
        }

        // Anti-spam 30 secondes
        const lastTx = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            toWalletId: wallet.id,
            currency: "SDA",
            type: TransactionType.DEPOSIT,
            createdAt: { gte: new Date(Date.now() - 30 * 1000) },
          },
        });

        if (lastTx) {
          return {
            updated: false,
            total: currentBalance,
            reason: "THROTTLED",
          };
        }

        // Mise à jour du solde
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: blockchainBalance },
        });

        // Log de transaction
        await tx.transaction.create({
          data: {
            reference: `SDA-SYNC-${nanoid(10).toUpperCase()}`,
            amount: Math.abs(diff),
            currency: "SDA",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            description: `Synchronisation Sidra Chain (${diff > 0 ? "+" : ""}${diff})`,
            toUserId: userId,
            toWalletId: updatedWallet.id,
            metadata: {
              blockchainBalance,
              previousBalance: currentBalance,
              syncType: "AUTOMATIC_BLOCKCHAIN",
            } as Prisma.JsonObject,
          },
        });

        return {
          updated: true,
          total: updatedWallet.balance,
          added: diff,
        };
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );

    if (!result.updated && result.reason === "THROTTLED") {
      return NextResponse.json(
        { error: "Veuillez patienter 30s avant une nouvelle synchronisation" },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.updated ? result.added : 0,
      message: result.updated
        ? "Synchronisation réussie"
        : "Solde déjà à jour",
    });
  } catch (error: any) {
    console.error("❌ FATAL_SYNC_ERROR:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la synchronisation",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
