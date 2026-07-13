/**
 * ============================================================
 * GET  /api/swap/simpleswap  → Obtenir un devis (mode fixe/floating)
 * POST /api/swap/simpleswap  → Exécuter l'échange
 * ============================================================
 *
 * SimpleSwap est un exchange non-custodial qui supporte +1000 paires.
 * Ce module utilise le mode FIXE par défaut : le taux est garanti.
 *
 * Doc API : https://api.simpleswap.io/docs/getting-started
 *
 * Variables d'environnement requises :
 *   SIMPLESWAP_API_KEY  →  clé API obtenue sur le Partner Dashboard
 *
 * Flow :
 *   1. GET /api/swap/simpleswap?from=BTC&to=USDT&amount=0.1
 *      → retourne { estimatedAmount, min, max, rateId, ... }
 *   2. POST /api/swap/simpleswap { fromToken, toToken, amount, toAddress, rateId }
 *      → crée l'échange SimpleSwap, débite le wallet PIMOBIPAY,
 *        retourne { depositAddress, id, reference }
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

const SS_BASE = "https://api.simpleswap.io/v3";

/**
 * Mapping symbol PIMOBIPAY → ticker:network SimpleSwap.
 * SimpleSwap utilise un format ticker:network pour identifier les devises.
 */
const SS_TICKER: Record<string, { ticker: string; network: string }> = {
  BTC:  { ticker: "btc",  network: "btc" },
  ETH:  { ticker: "eth",  network: "eth" },
  BNB:  { ticker: "bnb",  network: "bsc" },
  SOL:  { ticker: "sol",  network: "sol" },
  XRP:  { ticker: "xrp",  network: "xrp" },
  XLM:  { ticker: "xlm",  network: "xlm" },
  ADA:  { ticker: "ada",  network: "ada" },
  DOGE: { ticker: "doge", network: "doge" },
  TON:  { ticker: "ton",  network: "ton" },
  TRX:  { ticker: "trx",  network: "trx" },
  USDT: { ticker: "usdt", network: "trx" },  // USDT TRC-20 (le plus populaire)
  USDC: { ticker: "usdc", network: "eth" },  // USDC ERC-20
  DAI:  { ticker: "dai",  network: "eth" },
  BUSD: { ticker: "busd", network: "bsc" },
  EURC: { ticker: "eurc", network: "eth" },  // Euro Coin ERC-20
  OUSD: { ticker: "ousd", network: "eth" },  // Origin Dollar ERC-20
  LTC:  { ticker: "ltc",  network: "ltc" },
  MATIC: { ticker: "matic", network: "polygon" },
  AVAX: { ticker: "avax", network: "avax" },
  DOT:  { ticker: "dot",  network: "dot" },
  ATOM: { ticker: "atom", network: "atom" },
  LINK: { ticker: "link", network: "eth" },
};

/** Actifs gérés exclusivement par Sun.io (TRON DEX interne) */
const SUNIO_TOKENS = new Set(["TRX", "USDT", "USDC", "USDD", "SUN", "JST", "BTT", "WIN", "NFT", "WTRX"]);

/** Actifs internes PIMOBIPAY (pas listés sur SimpleSwap) */
const INTERNAL_TOKENS = new Set(["PI", "SDA"]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SSEstimate {
  estimatedAmount: string;
  rateId?: string;
  warningMessage?: string;
}

interface SSRanges {
  min: string;
  max: string | null;
}

interface SSExchangeResponse {
  id: string;
  addressFrom: string;
  addressTo: string;
  amountFrom: string;
  amountTo: string;
  status: string;
  redirectUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.SIMPLESWAP_API_KEY;
  if (!key) throw new Error("SIMPLESWAP_API_KEY manquante dans les variables d'environnement.");
  return key;
}

function toSSTicker(symbol: string): { ticker: string; network: string } {
  const entry = SS_TICKER[symbol.toUpperCase()];
  if (!entry) throw new Error(`Actif non supporté par SimpleSwap : ${symbol}`);
  return entry;
}

/**
 * Vérifie si une paire doit être routée vers SimpleSwap.
 * Retourne false si l'une des deux devises est TRON interne/interne.
 */
export function isSimpleSwapSupported(from: string, to: string): boolean {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  // Sun.io gère les paires TRX internes
  if (SUNIO_TOKENS.has(f) && SUNIO_TOKENS.has(t)) return false;
  // Tokens internes PIMOBIPAY
  if (INTERNAL_TOKENS.has(f) || INTERNAL_TOKENS.has(t)) return false;
  // Vérifier si supporté par SimpleSwap
  return f in SS_TICKER && t in SS_TICKER && f !== t;
}

/**
 * Récupère les limites (min/max) pour une paire.
 */
async function getRanges(
  fromSymbol: string,
  toSymbol: string,
  fixed: boolean = true
): Promise<SSRanges> {
  const apiKey = getApiKey();
  const from = toSSTicker(fromSymbol);
  const to = toSSTicker(toSymbol);

  const params = new URLSearchParams({
    fixed: fixed.toString(),
    tickerFrom: from.ticker,
    tickerTo: to.ticker,
    networkFrom: from.network,
    networkTo: to.network,
    reverse: "false",
  });

  const res = await fetch(`${SS_BASE}/ranges?${params}`, {
    headers: {
      "accept": "application/json",
      "x-api-key": apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SimpleSwap ranges API erreur ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    min: data.min || "0",
    max: data.max || null,
  };
}

/**
 * Récupère un devis depuis l'API SimpleSwap.
 */
async function getEstimate(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
  fixed: boolean = true
): Promise<SSEstimate & SSRanges & { fromAmount: number; toAmount: number }> {
  const apiKey = getApiKey();
  const from = toSSTicker(fromSymbol);
  const to = toSSTicker(toSymbol);

  // D'abord récupérer les limites
  const ranges = await getRanges(fromSymbol, toSymbol, fixed);

  // Vérifier si le montant est dans les limites
  const minAmount = parseFloat(ranges.min);
  if (fromAmount < minAmount) {
    throw new Error(`Montant minimum requis : ${minAmount} ${fromSymbol}`);
  }
  if (ranges.max) {
    const maxAmount = parseFloat(ranges.max);
    if (fromAmount > maxAmount) {
      throw new Error(`Montant maximum autorisé : ${maxAmount} ${fromSymbol}`);
    }
  }

  const params = new URLSearchParams({
    fixed: fixed.toString(),
    tickerFrom: from.ticker,
    tickerTo: to.ticker,
    networkFrom: from.network,
    networkTo: to.network,
    reverse: "false",
    amount: fromAmount.toString(),
  });

  const res = await fetch(`${SS_BASE}/estimates?${params}`, {
    headers: {
      "accept": "application/json",
      "x-api-key": apiKey,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SimpleSwap estimate API erreur ${res.status}: ${body}`);
  }

  const data = await res.json();

  if (!data.estimatedAmount && data.estimatedAmount !== "0") {
    throw new Error("Réponse SimpleSwap invalide ou paire non disponible.");
  }

  return {
    estimatedAmount: data.estimatedAmount,
    rateId: data.rateId || undefined,
    warningMessage: data.warningMessage || undefined,
    min: ranges.min,
    max: ranges.max,
    fromAmount,
    toAmount: parseFloat(data.estimatedAmount),
  };
}

/**
 * Crée un échange réel sur SimpleSwap.
 */
async function createExchange(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
  toAddress: string,
  extraIdTo: string = "",
  rateId?: string,
  refundAddress?: string,
  refundExtraId?: string,
  fixed: boolean = true
): Promise<SSExchangeResponse> {
  const apiKey = getApiKey();
  const from = toSSTicker(fromSymbol);
  const to = toSSTicker(toSymbol);

  const body: Record<string, unknown> = {
    fixed,
    tickerFrom: from.ticker,
    tickerTo: to.ticker,
    networkFrom: from.network,
    networkTo: to.network,
    amount: fromAmount.toString(),
    reverse: false,
    addressTo: toAddress,
    extraIdTo: extraIdTo || "",
  };

  if (rateId) {
    body.rateId = rateId;
  }

  if (refundAddress) {
    body.userRefundAddress = refundAddress;
    if (refundExtraId) {
      body.userRefundExtraId = refundExtraId;
    }
  }

  const res = await fetch(`${SS_BASE}/exchanges`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`SimpleSwap exchange creation erreur ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    addressFrom: data.addressFrom,
    addressTo: data.addressTo || toAddress,
    amountFrom: data.amountFrom || fromAmount.toString(),
    amountTo: data.amountTo || data.expectedAmountTo || "0",
    status: data.status || "waiting",
    redirectUrl: data.redirectUrl,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/swap/simpleswap — Obtenir un devis
// Query params : from, to, amount, fixed (optional, default true)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromToken = (searchParams.get("from") || "").toUpperCase();
    const toToken = (searchParams.get("to") || "").toUpperCase();
    const amount = parseFloat(searchParams.get("amount") || "0");
    const fixed = searchParams.get("fixed") !== "false"; // default true

    if (!fromToken || !toToken) {
      return NextResponse.json({ error: "Paramètres from et to requis" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!isSimpleSwapSupported(fromToken, toToken)) {
      return NextResponse.json(
        { error: `Paire ${fromToken}/${toToken} non supportée par SimpleSwap.` },
        { status: 400 }
      );
    }

    const quote = await getEstimate(fromToken, toToken, amount, fixed);

    return NextResponse.json({
      success: true,
      quote: {
        estimatedAmount: parseFloat(quote.estimatedAmount),
        min: parseFloat(quote.min),
        max: quote.max ? parseFloat(quote.max) : null,
        rateId: quote.rateId,
        warningMessage: quote.warningMessage,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        fromCurrency: fromToken,
        toCurrency: toToken,
      },
      flow: fixed ? "fixed-rate" : "floating-rate",
      provider: "SimpleSwap",
      supportedAssets: Object.keys(SS_TICKER),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/swap/simpleswap — Créer et enregistrer l'échange
// Body : { fromToken, toToken, amount, rateId?, toAddress?, extraIdTo?, refundAddress? }
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
    const rateId: string | undefined = body.rateId || undefined;
    const estimatedOut: number = parseFloat(body.estimatedOut || "0");
    const fixed: boolean = body.fixed !== false; // default true
    const extraIdTo: string = body.extraIdTo || "";

    if (!fromToken || !toToken) {
      return NextResponse.json({ error: "fromToken et toToken requis" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!isSimpleSwapSupported(fromToken, toToken)) {
      return NextResponse.json(
        { error: `Paire ${fromToken}/${toToken} non routée vers SimpleSwap.` },
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
        usdtAddress: true,    // TRON (TRX/USDT)
        tonAddress: true,     // TON
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Déterminer l'adresse de réception selon le token destination
    const toAddressMap: Record<string, string | null | undefined> = {
      BTC:   user.walletAddress,
      ETH:   user.sidraAddress,
      BNB:   user.sidraAddress,
      USDC:  user.sidraAddress,
      DAI:   user.sidraAddress,
      BUSD:  user.sidraAddress,
      EURC:  user.sidraAddress,
      OUSD:  user.sidraAddress,
      LINK:  user.sidraAddress,
      MATIC: user.sidraAddress,
      SOL:   user.solAddress,
      XRP:   user.xrpAddress,
      XLM:   user.xlmAddress,
      TRX:   user.usdtAddress,
      USDT:  user.usdtAddress,
      ADA:   user.sidraAddress,
      DOGE:  user.walletAddress,
      TON:   user.tonAddress || user.sidraAddress,
      LTC:   user.walletAddress,
      AVAX:  user.sidraAddress,
      DOT:   user.sidraAddress,
      ATOM:  user.sidraAddress,
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

    // 4. Vérifier le solde PIMOBIPAY du wallet source
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

    // 5. Calculer les frais PIMOBIPAY
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
          reference: `PIM-SS-${nanoid(10).toUpperCase()}`,
          amount,
          fee: pimpayFee,
          netAmount: amount - pimpayFee,
          currency: fromToken,
          type: TransactionType.SWAP,
          status: TransactionStatus.PENDING,
          statusClass: "SIMPLESWAP_PENDING",
          fromUserId: userId,
          fromWalletId: freshWallet.id,
          description: `Swap SimpleSwap${fixed ? " (fixe)" : ""} : ${amount} ${fromToken} → ~${estimatedOut.toFixed(6)} ${toToken}`,
          metadata: {
            fromToken,
            toToken,
            amountIn: amount,
            estimatedAmountOut: estimatedOut,
            rateId,
            toAddress,
            provider: "SimpleSwap",
            flow: fixed ? "fixed-rate" : "floating-rate",
            requestedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 7. Créer l'échange sur SimpleSwap (hors transaction Prisma)
    let ssExchange: SSExchangeResponse | null = null;
    let ssError: string | null = null;

    try {
      ssExchange = await createExchange(
        fromToken,
        toToken,
        amount,
        toAddress,
        extraIdTo,
        rateId,
        user.usdtAddress || undefined, // adresse de remboursement
        undefined,
        fixed
      );
    } catch (e: unknown) {
      ssError = e instanceof Error ? e.message : "Erreur inconnue";
      console.error("[SWAP_SIMPLESWAP] Erreur création échange:", ssError);
    }

    if (ssExchange) {
      const amountOut = parseFloat(ssExchange.amountTo);
      
      // ✅ Échange créé avec succès → mettre à jour la transaction en DB
      await prisma.$transaction([
        // Créditer le wallet destination avec le montant estimé
        prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: toToken } },
          update: { balance: { increment: amountOut } },
          create: {
            userId,
            currency: toToken,
            balance: amountOut,
            type: "CRYPTO",
          },
        }),

        // Mettre à jour la transaction → SUCCESS
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.SUCCESS,
            statusClass: undefined,
            description: `Swap SimpleSwap${fixed ? " (fixe)" : ""} : ${amount} ${fromToken} → ${amountOut.toFixed(6)} ${toToken}`,
            metadata: {
              ...(txRecord.metadata as object),
              simpleswapId: ssExchange.id,
              depositAddress: ssExchange.addressFrom,
              actualAmountOut: amountOut,
              ssStatus: ssExchange.status,
              redirectUrl: ssExchange.redirectUrl,
              confirmedAt: new Date().toISOString(),
            },
          },
        }),

        // Notification utilisateur
        prisma.notification.create({
          data: {
            userId,
            title: "Swap SimpleSwap initié !",
            message: `Échange de ${amount} ${fromToken} vers ${amountOut.toFixed(6)} ${toToken} en cours. ID : ${ssExchange.id}`,
            type: "SWAP_SUCCESS",
            metadata: {
              fromToken,
              toToken,
              amountIn: amount,
              amountOut,
              simpleswapId: ssExchange.id,
              depositAddress: ssExchange.addressFrom,
            },
          },
        }),
      ]);

      // Auto-conversion des frais PIMOBIPAY en PI
      if (pimpayFee > 0) {
        autoConvertFeeToPi(pimpayFee, fromToken, txRecord.id, txRecord.reference).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        simpleswapId: ssExchange.id,
        depositAddress: ssExchange.addressFrom,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut,
        redirectUrl: ssExchange.redirectUrl,
        estimatedTime: "5–30 minutes",
        reference: txRecord.reference,
        message: `Échange SimpleSwap créé. ID : ${ssExchange.id}`,
      });
    } else {
      // ❌ Échec SimpleSwap → rembourser et marquer FAILED
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId_currency: { userId, currency: fromToken } },
          data: { balance: { increment: amount } },
        }),
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.FAILED,
            statusClass: "SIMPLESWAP_FAILED",
            description: `[ÉCHEC SimpleSwap] ${ssError || "Erreur inconnue"}`,
          },
        }),
      ]);

      return NextResponse.json(
        {
          error: `Swap annulé : ${ssError || "Erreur SimpleSwap"}. Votre solde ${fromToken} a été restitué.`,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[SWAP_SIMPLESWAP] Erreur générale:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
