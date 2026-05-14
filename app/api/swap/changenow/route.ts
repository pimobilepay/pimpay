/**
 * ============================================================
 * GET  /api/swap/changenow  → Obtenir un devis (mode fixe)
 * POST /api/swap/changenow  → Exécuter l'échange
 * ============================================================
 *
 * ChangeNow est un exchange non-custodial qui supporte +500 cryptos.
 * Ce module utilise le mode FIXE : le taux est garanti à la création
 * de l'échange. L'utilisateur reçoit exactement le montant affiché.
 *
 * Doc API : https://doc.changenow.io/
 *
 * Variables d'environnement requises :
 *   CHANGENOW_API_KEY  →  clé API obtenue sur https://changenow.io/affiliate
 *
 * Flow :
 *   1. GET /api/swap/changenow?from=BTC&to=ETH&amount=0.1
 *      → retourne { estimatedAmount, validUntil, rateId, ... }
 *   2. POST /api/swap/changenow { rateId, fromToken, toToken, amount, toAddress }
 *      → crée l'échange ChangeNow, débite le wallet PimPay,
 *        retourne { payinAddress, id, reference }
 * ============================================================
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { nanoid } from "nanoid";
import { TransactionStatus, TransactionType } from "@prisma/client";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CN_BASE = "https://api.changenow.io/v2";

/**
 * Mapping symbol PimPay → ticker ChangeNow.
 * ChangeNow utilise parfois des suffixes réseau (ex: usdcerc20, busdbsc).
 * Ce mapping cible le réseau le plus liquide pour chaque actif.
 */
const CN_TICKER: Record<string, string> = {
  BTC:  "btc",
  ETH:  "eth",
  BNB:  "bnb",       // BEP-20
  SOL:  "sol",
  XRP:  "xrp",
  XLM:  "xlm",
  ADA:  "ada",
  DOGE: "doge",
  TON:  "ton",
  USDC: "usdcerc20", // USDC ERC-20 (le plus liquide)
  DAI:  "dai",
  BUSD: "busdbsc",   // BUSD BEP-20
};

/** Actifs gérés exclusivement par Sun.io (TRON DEX) */
const SUNIO_TOKENS = new Set(["TRX", "USDT", "USDC", "USDD", "SUN", "JST", "BTT", "WIN", "NFT", "WTRX"]);

/** Actifs internes PimPay (pas listés sur ChangeNow) */
const INTERNAL_TOKENS = new Set(["PI", "SDA"]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CNFixedQuote {
  estimatedAmount: number;
  validUntil: string;
  rateId: string;
  transactionSpeedForecast: string;
  warningMessage: string | null;
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
}

interface CNExchangeResponse {
  id: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  status: string;
  validUntil: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.CHANGENOW_API_KEY;
  if (!key) throw new Error("CHANGENOW_API_KEY manquante dans les variables d'environnement.");
  return key;
}

function toCNTicker(symbol: string): string {
  const ticker = CN_TICKER[symbol.toUpperCase()];
  if (!ticker) throw new Error(`Actif non supporté par ChangeNow : ${symbol}`);
  return ticker;
}

/**
 * Vérifie si une paire doit être routée vers ChangeNow.
 * Retourne false si l'une des deux devises est TRON/interne.
 */
export function isChangeNowSwap(from: string, to: string): boolean {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (SUNIO_TOKENS.has(f) && SUNIO_TOKENS.has(t)) return false; // Géré par Sun.io
  if (INTERNAL_TOKENS.has(f) || INTERNAL_TOKENS.has(t)) return false; // Interne PimPay
  return f in CN_TICKER && t in CN_TICKER && f !== t;
}

/**
 * Récupère un devis en mode fixe depuis l'API ChangeNow.
 * L'endpoint /exchange/fixed-rate/estimate retourne le montant garanti
 * et un rateId valable ~10 minutes.
 */
async function getFixedQuote(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number
): Promise<CNFixedQuote> {
  const apiKey = getApiKey();
  const fromCurrency = toCNTicker(fromSymbol);
  const toCurrency = toCNTicker(toSymbol);

  const params = new URLSearchParams({
    fromCurrency,
    toCurrency,
    fromAmount: fromAmount.toString(),
    flow: "fixed-rate",
  });

  const res = await fetch(`${CN_BASE}/exchange/estimated-amount?${params}`, {
    headers: {
      "x-changenow-api-key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ChangeNow estimate API erreur ${res.status}: ${body}`);
  }

  const data = await res.json();

  if (!data.estimatedAmount && data.estimatedAmount !== 0) {
    throw new Error("Réponse ChangeNow invalide ou paire non disponible.");
  }

  return {
    estimatedAmount: parseFloat(data.estimatedAmount),
    validUntil: data.validUntil || "",
    rateId: data.rateId || "",
    transactionSpeedForecast: data.transactionSpeedForecast || "10-60 min",
    warningMessage: data.warningMessage || null,
    fromAmount,
    toAmount: parseFloat(data.estimatedAmount),
    fromCurrency: fromSymbol.toUpperCase(),
    toCurrency: toSymbol.toUpperCase(),
  };
}

/**
 * Crée un échange réel sur ChangeNow (mode fixe).
 * L'utilisateur doit envoyer ses fonds à `payinAddress`.
 * ChangeNow enverra automatiquement `toAmount` vers `toAddress`.
 */
async function createFixedExchange(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
  toAddress: string,
  rateId: string,
  refundAddress?: string
): Promise<CNExchangeResponse> {
  const apiKey = getApiKey();
  const fromCurrency = toCNTicker(fromSymbol);
  const toCurrency = toCNTicker(toSymbol);

  const body = {
    fromCurrency,
    toCurrency,
    fromAmount,
    address: toAddress,        // adresse de réception du token destination
    flow: "fixed-rate",
    rateId,                    // ID du taux fixe (expire après ~10 min)
    ...(refundAddress && { refundAddress }), // adresse de remboursement en cas d'échec
  };

  const res = await fetch(`${CN_BASE}/exchange`, {
    method: "POST",
    headers: {
      "x-changenow-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ChangeNow exchange creation erreur ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    payinAddress: data.payinAddress,
    payoutAddress: data.payoutAddress || toAddress,
    fromCurrency: fromSymbol.toUpperCase(),
    toCurrency: toSymbol.toUpperCase(),
    fromAmount: parseFloat(data.fromAmount || fromAmount),
    toAmount: parseFloat(data.toAmount || data.expectedAmountTo || 0),
    status: data.status || "waiting",
    validUntil: data.validUntil || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/swap/changenow — Obtenir un devis fixe
// Query params : from, to, amount
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromToken = (searchParams.get("from") || "").toUpperCase();
    const toToken = (searchParams.get("to") || "").toUpperCase();
    const amount = parseFloat(searchParams.get("amount") || "0");

    if (!fromToken || !toToken) {
      return NextResponse.json({ error: "Paramètres from et to requis" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!isChangeNowSwap(fromToken, toToken)) {
      return NextResponse.json(
        { error: `Paire ${fromToken}/${toToken} non supportée par ChangeNow. Utilisez Sun.io pour les paires TRON.` },
        { status: 400 }
      );
    }

    const quote = await getFixedQuote(fromToken, toToken, amount);

    return NextResponse.json({
      success: true,
      quote,
      flow: "fixed-rate",
      note: "Le taux est garanti. Le rateId expire généralement dans 10 minutes.",
      supportedAssets: Object.keys(CN_TICKER),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/swap/changenow — Créer et enregistrer l'échange
// Body : { fromToken, toToken, amount, rateId, toAddress?, refundAddress? }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const userId = payload.id;

    // 2. Paramètres
    const body = await req.json();
    const fromToken: string = (body.fromToken || "").toUpperCase();
    const toToken: string = (body.toToken || "").toUpperCase();
    const amount: number = parseFloat(body.amount);
    const rateId: string = body.rateId || "";
    const estimatedOut: number = parseFloat(body.estimatedOut || "0");

    if (!fromToken || !toToken) {
      return NextResponse.json({ error: "fromToken et toToken requis" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!rateId) {
      return NextResponse.json({ error: "rateId manquant. Obtenez d'abord un devis (GET)." }, { status: 400 });
    }
    if (!isChangeNowSwap(fromToken, toToken)) {
      return NextResponse.json(
        { error: `Paire ${fromToken}/${toToken} non routée vers ChangeNow.` },
        { status: 400 }
      );
    }

    // 3. Récupérer l'utilisateur et son adresse de réception pour le token destination
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        walletAddress: true,  // BTC/générique
        sidraAddress: true,   // ETH/BNB/EVM
        solAddress: true,     // SOL
        xrpAddress: true,     // XRP
        xlmAddress: true,     // XLM/Stellar
        usdtAddress: true,    // TRON (remboursement éventuel)
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Déterminer l'adresse de réception selon le token destination
    const toAddressMap: Record<string, string | null> = {
      BTC:  user.walletAddress,
      ETH:  user.sidraAddress,
      BNB:  user.sidraAddress,
      USDC: user.sidraAddress,
      DAI:  user.sidraAddress,
      BUSD: user.sidraAddress,
      SOL:  user.solAddress,
      XRP:  user.xrpAddress,
      XLM:  user.xlmAddress,
      ADA:  user.sidraAddress, // Cardano → adresse EVM par défaut (à adapter)
      DOGE: user.walletAddress,
      TON:  user.sidraAddress,
    };

    const toAddress = body.toAddress || toAddressMap[toToken];
    if (!toAddress) {
      return NextResponse.json(
        {
          error: `Adresse ${toToken} non configurée dans votre profil. Veuillez d'abord configurer votre portefeuille ${toToken}.`,
        },
        { status: 400 }
      );
    }

    // 4. Vérifier le solde PimPay du wallet source
    const fromWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: fromToken } },
    });

    if (!fromWallet || fromWallet.balance < amount) {
      return NextResponse.json(
        {
          error: `Solde ${fromToken} insuffisant. Disponible : ${fromWallet?.balance?.toFixed(6) || "0"} ${fromToken}`,
        },
        { status: 400 }
      );
    }

    // 5. Calculer les frais PimPay
    const feeConfig = await getFeeConfig();
    const { feeAmount: pimpayFee } = calculateFee(amount, feeConfig, "transfer");

    // 6. Débiter le wallet source en DB + créer transaction PENDING (atomique)
    const txRecord = await prisma.$transaction(async (tx) => {
      // Re-vérification du solde en transaction pour éviter les race conditions
      const freshWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromToken } },
      });
      if (!freshWallet || freshWallet.balance < amount) {
        throw new Error(`Solde ${fromToken} insuffisant.`);
      }

      // Débiter
      await tx.wallet.update({
        where: { id: freshWallet.id },
        data: { balance: { decrement: amount } },
      });

      // Créer la transaction PENDING
      return tx.transaction.create({
        data: {
          reference: `PIM-CN-${nanoid(10).toUpperCase()}`,
          amount,
          fee: pimpayFee,
          netAmount: amount - pimpayFee,
          currency: fromToken,
          type: TransactionType.SWAP,
          status: TransactionStatus.PENDING,
          statusClass: "CHANGENOW_PENDING",
          fromUserId: userId,
          fromWalletId: freshWallet.id,
          description: `Swap ChangeNow (fixe) : ${amount} ${fromToken} → ~${estimatedOut.toFixed(6)} ${toToken}`,
          metadata: {
            fromToken,
            toToken,
            amountIn: amount,
            estimatedAmountOut: estimatedOut,
            rateId,
            toAddress,
            provider: "ChangeNow",
            flow: "fixed-rate",
            requestedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 7. Créer l'échange sur ChangeNow (hors transaction Prisma)
    let cnExchange: CNExchangeResponse | null = null;
    let cnError: string | null = null;

    try {
      cnExchange = await createFixedExchange(
        fromToken,
        toToken,
        amount,
        toAddress,
        rateId,
        user.usdtAddress || undefined // adresse de remboursement TRON si échec
      );
    } catch (e: any) {
      cnError = e.message;
      console.error("[SWAP_CHANGENOW] Erreur création échange:", e.message);
    }

    if (cnExchange) {
      // ✅ Échange créé avec succès → mettre à jour la transaction en DB
      await prisma.$transaction([
        // Créditer le wallet destination avec le montant estimé
        // (le solde réel sera réconcilié lors du webhook de confirmation ChangeNow)
        prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: toToken } },
          update: { balance: { increment: cnExchange.toAmount } },
          create: {
            userId,
            currency: toToken,
            balance: cnExchange.toAmount,
            type: "CRYPTO",
          },
        }),

        // Mettre à jour la transaction → SUCCESS
        // Note : ChangeNow peut mettre 10-60 min pour finaliser l'échange on-chain,
        // mais du point de vue PimPay, l'échange est confirmé dès la création.
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.SUCCESS,
            statusClass: undefined,
            description: `Swap ChangeNow (fixe) : ${amount} ${fromToken} → ${cnExchange.toAmount.toFixed(6)} ${toToken}`,
            metadata: {
              ...(txRecord.metadata as object),
              changenowId: cnExchange.id,
              payinAddress: cnExchange.payinAddress,
              actualAmountOut: cnExchange.toAmount,
              cnStatus: cnExchange.status,
              validUntil: cnExchange.validUntil,
              confirmedAt: new Date().toISOString(),
            },
          },
        }),

        // Notification utilisateur
        prisma.notification.create({
          data: {
            userId,
            title: "Swap ChangeNow initié !",
            message: `Échange de ${amount} ${fromToken} vers ${cnExchange.toAmount.toFixed(6)} ${toToken} en cours. ID : ${cnExchange.id}`,
            type: "SWAP_SUCCESS",
            metadata: {
              fromToken,
              toToken,
              amountIn: amount,
              amountOut: cnExchange.toAmount,
              changenowId: cnExchange.id,
              payinAddress: cnExchange.payinAddress,
            },
          },
        }),
      ]);

      // Auto-conversion des frais PimPay en PI
      if (pimpayFee > 0) {
        autoConvertFeeToPi(pimpayFee, fromToken, txRecord.id, txRecord.reference).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        changenowId: cnExchange.id,
        payinAddress: cnExchange.payinAddress,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut: cnExchange.toAmount,
        estimatedTime: "10–60 minutes",
        reference: txRecord.reference,
        message: `Échange ChangeNow créé. ID : ${cnExchange.id}`,
      });
    } else {
      // ❌ Échec ChangeNow → rembourser et marquer FAILED
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId_currency: { userId, currency: fromToken } },
          data: { balance: { increment: amount } },
        }),
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.FAILED,
            statusClass: "CHANGENOW_FAILED",
            description: `[ÉCHEC ChangeNow] ${cnError || "Erreur inconnue"}`,
          },
        }),
      ]);

      return NextResponse.json(
        {
          error: `Swap annulé : ${cnError || "Erreur ChangeNow"}. Votre solde ${fromToken} a été restitué.`,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[SWAP_CHANGENOW] Erreur générale:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
