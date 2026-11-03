import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { parseAmount } from "@/lib/amount-guard";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { isValidTronAddress } from "@/lib/tron-utils";
import { getTrxBalance, getUsdtBalance } from "@/lib/blockchain/tron";
import {
  ADMIN_TRANSFER_ASSETS,
  isAdminTransferAsset,
  tronGasReserve,
  round8,
  type AdminTransferAsset,
} from "@/lib/admin-transfer";
import { readStoredPrivateKey } from "@/lib/crypto";
import { TronWeb } from "tronweb";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/** Formats d'adresse des SEULS actifs que le worker sait diffuser. */
const ADDRESS_PATTERNS: Record<AdminTransferAsset, RegExp> = {
  PI: /^G[A-Z2-7]{55}$/,
  DOGE: /^D[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  TRX: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  USDT: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

/** Erreur métier : message affichable tel quel à l'admin (400). */
class TransferError extends Error {}

/**
 * Frais du retrait : MÊME source que le retrait utilisateur
 * (SystemConfig.withdrawFee via lib/fees) — jamais de valeur codée en dur.
 */
async function quoteFee(amount: number) {
  const config = await getFeeConfig();
  const { feeRate, feeAmount } = calculateFee(amount, config, "withdraw");
  const fee = round8(feeAmount);
  return { feeRate, fee, totalDebit: round8(amount + fee) };
}

/**
 * GET ?currency=TRX&amount=10 — aperçu des frais et du solde pour l'UI admin.
 * Lecture seule : aucune écriture.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(req, PERMISSIONS.WITHDRAWALS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;
  const url = new URL(req.url);
  const currency = String(url.searchParams.get("currency") || "").toUpperCase();
  if (!isAdminTransferAsset(currency)) {
    return NextResponse.json({ error: `Actif ${currency || "?"} non supporté pour le transfert externe` }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
    select: { balance: true },
  });
  const balance = wallet?.balance ?? 0;

  const parsed = parseAmount(url.searchParams.get("amount"));
  if (!parsed.ok) return NextResponse.json({ balance, feeRate: null, fee: null, totalDebit: null, sufficient: false });

  const { feeRate, fee, totalDebit } = await quoteFee(parsed.value);
  return NextResponse.json({ balance, feeRate, fee, totalDebit, sufficient: balance >= totalDebit });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(req, PERMISSIONS.WITHDRAWALS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;
  const body = await req.json().catch(() => ({}));
  const currency = String(body.currency || "").toUpperCase();
  const address = String(body.address || "").trim();
  const parsed = parseAmount(body.amount);

  // ── 1. Validations (AUCUNE écriture tant qu'elles ne passent pas) ───────────
  if (!isAdminTransferAsset(currency)) {
    return NextResponse.json(
      { error: `Actif ${currency || "?"} non supporté : seuls ${Object.keys(ADMIN_TRANSFER_ASSETS).join(", ")} peuvent être diffusés sur la blockchain.` },
      { status: 400 }
    );
  }
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const amount = parsed.value;
  if (address.length > 200 || !ADDRESS_PATTERNS[currency].test(address)) {
    return NextResponse.json({ error: `Adresse ${currency} invalide` }, { status: 400 });
  }
  const family = ADMIN_TRANSFER_ASSETS[currency].family;
  if (family === "TRON" && !isValidTronAddress(address)) {
    return NextResponse.json({ error: "Adresse TRON invalide (checksum incorrect)" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, usdtAddress: true, usdtPrivateKey: true, dogeAddress: true, dogePrivateKey: true } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // ── 1b. Clé de signature exploitable (AVANT tout débit) ─────────────────────
  // Les fonds sont sur les adresses des utilisateurs : le worker signe avec la
  // clé privée stockée. Une clé absente, illisible ou ne correspondant pas à
  // l'adresse ferait échouer le broadcast après le débit.
  try {
    if (family === "TRON") {
      if (!user.usdtAddress) throw new TransferError("Aucun portefeuille TRON configuré pour cet utilisateur");
      const key = readStoredPrivateKey(user.usdtPrivateKey);
      const derived = TronWeb.address.fromPrivateKey(key);
      if (!derived || derived !== user.usdtAddress) {
        throw new TransferError("La clé privée TRON stockée ne correspond pas à l'adresse du portefeuille. Utilisez la réparation des portefeuilles.");
      }
    } else if (family === "DOGE") {
      if (!user.dogeAddress) throw new TransferError("Aucun portefeuille DOGE configuré pour cet utilisateur");
      readStoredPrivateKey(user.dogePrivateKey);
    } else if (!process.env.PI_MASTER_WALLET_SECRET || !process.env.PI_MASTER_WALLET_ADDRESS) {
      throw new TransferError("Wallet maître Pi non configuré (PI_MASTER_WALLET_SECRET / PI_MASTER_WALLET_ADDRESS)");
    }
  } catch (keyError: any) {
    const msg = keyError instanceof TransferError ? keyError.message : "Clé privée de l'utilisateur illisible (ENCRYPTION_KEY ou format invalide). Aucun débit effectué.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // ── 2. Frais plateforme (même config que le retrait utilisateur) ─────────────
  const { feeRate, fee, totalDebit } = await quoteFee(amount);

  // ── 3. Couverture ON-CHAIN (TRON) : montant + frais plateforme + frais réseau ─
  // Le worker envoie `amount` puis collecte `fee` depuis l'adresse TRON de
  // l'utilisateur, le tout payé en TRX (bande passante / énergie). Sans ce
  // contrôle, le débit a lieu puis le broadcast échoue ou la collecte des frais
  // reste en erreur.
  if (family === "TRON") {
    if (!user.usdtAddress) {
      return NextResponse.json({ error: "Aucun portefeuille TRON configuré pour cet utilisateur" }, { status: 400 });
    }
    if (address === user.usdtAddress) {
      return NextResponse.json({ error: "L'adresse de destination est celle du portefeuille source" }, { status: 400 });
    }
    try {
      const gas = tronGasReserve(currency as "TRX" | "USDT");
      if (currency === "TRX") {
        const onChain = await getTrxBalance(user.usdtAddress);
        const required = round8(totalDebit + gas);
        if (onChain < required) {
          return NextResponse.json({
            error: `Solde TRX on-chain insuffisant : ${onChain} disponible, ${required} requis (montant ${amount} + frais ${fee} + réserve réseau ${gas}).`,
          }, { status: 400 });
        }
      } else {
        const [usdtOnChain, trxOnChain] = await Promise.all([getUsdtBalance(user.usdtAddress), getTrxBalance(user.usdtAddress)]);
        if (usdtOnChain < totalDebit) {
          return NextResponse.json({
            error: `Solde USDT on-chain insuffisant : ${usdtOnChain} disponible, ${totalDebit} requis (montant ${amount} + frais ${fee}).`,
          }, { status: 400 });
        }
        if (trxOnChain < gas) {
          return NextResponse.json({
            error: `TRX insuffisant pour les frais réseau TRON : ${trxOnChain} disponible, ${gas} requis sur l'adresse de l'utilisateur.`,
          }, { status: 400 });
        }
      }
    } catch (chainError) {
      console.error("[ADMIN_TRANSFER] Vérification on-chain impossible", chainError);
      return NextResponse.json({ error: "Impossible de vérifier le solde on-chain pour le moment. Aucun débit effectué, réessayez." }, { status: 503 });
    }
  }

  // ── 4. Débit atomique (montant + frais) + transaction + profit plateforme ────
  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId_currency: { userId, currency } } });
      if (!wallet) throw new TransferError(`Aucun portefeuille ${currency} pour cet utilisateur`);

      // Le contrôle du solde est DANS la requête de débit : deux transferts
      // simultanés ne peuvent plus passer sous le même solde (course critique).
      const debited = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: totalDebit } },
        data: { balance: { decrement: totalDebit } },
      });
      if (debited.count !== 1) {
        throw new TransferError(`Solde ${currency} insuffisant : ${totalDebit} requis (montant ${amount} + frais ${fee}), ${wallet.balance} disponible.`);
      }

      const transaction = await tx.transaction.create({ data: {
        reference: `ADM-EXT-${nanoid(10).toUpperCase()}`,
        amount,
        fee,
        netAmount: amount, // ce que reçoit réellement le destinataire
        currency, type: "WITHDRAW", status: "SUCCESS", statusClass: "QUEUED",
        fromUserId: userId, fromWalletId: wallet.id, accountNumber: address,
        description: String(body.note || `Transfert externe ${currency} par administrateur`).slice(0, 200),
        metadata: {
          externalAddress: address,
          destinationAddress: address,
          network: currency,
          isBlockchainWithdraw: true,
          adminExternalTransfer: true,
          initiatedByAdmin: ctx.payload.id,
          feeRate,
          feeApplied: `${round8(feeRate * 100)}%`,
          totalDebit,
          // Indique que `fee` a été ajouté à SystemConfig.totalProfit : il devra
          // être retranché si le transfert est recrédité (échec / annulation).
          profitCounted: fee > 0,
          queuedAt: new Date().toISOString(),
        },
      } });

      if (fee > 0) {
        await tx.systemConfig.updateMany({ where: { id: "GLOBAL_CONFIG" }, data: { totalProfit: { increment: fee } } });
      }
      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    await logAdminAction(req, ctx.payload, {
      action: "ADMIN_EXTERNAL_ASSET_TRANSFER", category: "withdrawals", targetType: "USER", targetId: userId,
      details: `${result.reference} · ${amount} ${currency} + frais ${fee} (total débité ${totalDebit}) · ${address.slice(0, 12)}…`,
    });

    // ── 5. Diffusion immédiate de CE transfert précis ─────────────────────────
    // `jobId` évite que le worker traite un autre retrait plus ancien de la file.
    const workerSecret = process.env.WORKER_SECRET;
    if (workerSecret) {
      try {
        await fetch(new URL(`/api/worker/withdraw?limit=1&jobId=${encodeURIComponent(result.id)}`, req.url), {
          method: "POST",
          headers: { "x-worker-secret": workerSecret },
          cache: "no-store",
        });
      } catch (workerError) {
        console.error("[ADMIN_TRANSFER] Worker indisponible", workerError);
      }
    }

    // L'état réel est relu en base : c'est la source de vérité (et non la
    // réponse du worker), y compris pour la collecte des frais TRON.
    const final = await prisma.transaction.findUnique({
      where: { id: result.id },
      select: { statusClass: true, blockchainTx: true, metadata: true },
    });
    const meta = (final?.metadata && typeof final.metadata === "object" ? final.metadata : {}) as Record<string, any>;
    const summary = { reference: result.reference, amount, fee, totalDebit, currency };

    if (final?.blockchainTx) {
      return NextResponse.json({
        success: true, status: "BROADCASTED", ...summary, blockchainTx: final.blockchainTx,
        message: `Transfert ${currency} diffusé sur la blockchain.`,
        warning: meta.feeCollectionError ? `Frais plateforme non collectés on-chain : ${meta.feeCollectionError}` : undefined,
      });
    }
    if (final?.statusClass === "FAILED_BROADCAST") {
      return NextResponse.json({
        success: false, status: "FAILED", ...summary,
        error: `Diffusion ${currency} échouée : ${meta.broadcastError || "erreur inconnue"}. ${
          meta.refunded ? "Le solde (montant + frais) a été recrédité." : "Le débit est conservé : utilisez « Relancer » ou « Annuler et recréditer »."
        }`,
      }, { status: 502 });
    }
    return NextResponse.json({
      success: true, status: "PENDING", ...summary,
      message: "Transfert enregistré et placé en file de traitement.",
    });
  } catch (error: any) {
    if (error instanceof TransferError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[ADMIN_TRANSFER] Erreur inattendue", error);
    return NextResponse.json({ error: "Erreur serveur lors du transfert. Vérifiez l'historique avant de réessayer." }, { status: 500 });
  }
}
