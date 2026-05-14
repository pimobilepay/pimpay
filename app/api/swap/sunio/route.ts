/**
 * ============================================================
 * POST /api/swap/sunio
 * ============================================================
 * Swap de tokens sur TRON via l'API Sun.io (sun.io — DEX Tron)
 *
 * Sun.io est le principal DEX sur la blockchain TRON.
 * Il expose une API REST publique compatible avec l'agrégateur
 * de liquidité SunSwap V2/V3.
 *
 * API de référence : https://api.sun.io/
 * Paires supportées : TRX ↔ USDT, TRX ↔ USDC, USDT ↔ USDC, etc.
 *
 * Flow :
 *   1. GET /api/swap/sunio/quote  → obtenir le prix et le slippage estimé
 *   2. POST /api/swap/sunio       → exécuter le swap on-chain via TronWeb
 *
 * ⚠️  Nécessite :
 *   - La clé privée TRON de l'utilisateur (usdtPrivateKey en DB)
 *   - Un solde TRX suffisant pour les frais (~20 TRX recommandé)
 *   - TRONGRID_API_KEY dans les variables d'environnement
 * ============================================================
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { nanoid } from "nanoid";
import { TransactionStatus, TransactionType } from "@prisma/client";

// ─── TronWeb ──────────────────────────────────────────────────────────────────
const TronWebModule = require("tronweb");
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

// ─── Constantes Sun.io ────────────────────────────────────────────────────────

/** Base URL de l'API Sun.io (agrégateur SunSwap) */
const SUNIO_API_BASE = "https://api.sun.io";

/** Version du routeur SunSwap (V2 = AMM classique, V3 = concentrated liquidity) */
const SUNSWAP_VERSION = "v2"; // Changer en "v3" si vous voulez les pools V3

/**
 * Adresses des tokens TRC20 courants sur TRON mainnet.
 * Source : https://tronscan.org / sun.io/pools
 */
const TOKEN_ADDRESSES: Record<string, string> = {
  TRX: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", // adresse native TRX (convention Sun.io)
  USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  USDC: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
  USDD: "TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn",
  WTRX: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", // Wrapped TRX
  JST:  "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9",
  SUN:  "TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S",
  BTT:  "TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4",
  WIN:  "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
  NFT:  "TFczxzPhnThNSqr5by8tvxsdCFRg8vFn4F",
};

const TRON_FULL_HOST = "https://api.trongrid.io";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SunioQuoteResponse {
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  route: string[];
  routerAddress: string;
  minAmountOut: string;
  fee: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Récupère un devis de swap depuis l'API Sun.io.
 * Endpoint : GET /swap/v2/quote
 */
async function getSunioQuote(
  fromToken: string,
  toToken: string,
  amountIn: number,
  slippageBps: number = 50 // 0.5% par défaut
): Promise<SunioQuoteResponse> {
  const fromAddress = TOKEN_ADDRESSES[fromToken.toUpperCase()];
  const toAddress = TOKEN_ADDRESSES[toToken.toUpperCase()];

  if (!fromAddress) throw new Error(`Token source non supporté sur Sun.io: ${fromToken}`);
  if (!toAddress) throw new Error(`Token destination non supporté sur Sun.io: ${toToken}`);

  // Sun.io attend le montant en unité de base (6 décimales pour USDT/TRC20, 6 pour TRX)
  const decimals = fromToken.toUpperCase() === "TRX" ? 6 : 6;
  const amountInRaw = Math.floor(amountIn * Math.pow(10, decimals)).toString();

  const params = new URLSearchParams({
    fromTokenAddress: fromAddress,
    toTokenAddress: toAddress,
    amountIn: amountInRaw,
    slippage: slippageBps.toString(), // en points de base (50 = 0.5%)
  });

  const apiKey = process.env.TRONGRID_API_KEY || "";
  const response = await fetch(
    `${SUNIO_API_BASE}/swap/${SUNSWAP_VERSION}/quote?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "TRON-PRO-API-KEY": apiKey }),
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Sun.io quote API erreur ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Normalisation de la réponse (le format Sun.io peut varier selon la version)
  const amountOutRaw = data?.amountOut || data?.data?.amountOut || "0";
  const toDecimals = toToken.toUpperCase() === "TRX" ? 6 : 6;
  const amountOut = Number(amountOutRaw) / Math.pow(10, toDecimals);

  const minAmountOutRaw = data?.minAmountOut || data?.data?.minAmountOut || amountOutRaw;
  const minAmountOut = Number(minAmountOutRaw) / Math.pow(10, toDecimals);

  return {
    fromToken: fromToken.toUpperCase(),
    toToken: toToken.toUpperCase(),
    amountIn: amountIn.toString(),
    amountOut: amountOut.toFixed(6),
    priceImpact: data?.priceImpact || data?.data?.priceImpact || "0",
    route: data?.route || data?.data?.route || [fromAddress, toAddress],
    routerAddress: data?.routerAddress || data?.data?.routerAddress || "",
    minAmountOut: minAmountOut.toFixed(6),
    fee: data?.fee || data?.data?.fee || "0",
  };
}

/**
 * Exécute le swap on-chain via le contrat SunSwap.
 * Utilise TronWeb pour broadcaster la transaction.
 */
async function executeSunioSwap(
  privateKey: string,
  fromToken: string,
  toToken: string,
  amountIn: number,
  minAmountOut: number,
  routerAddress: string,
  route: string[]
): Promise<string> {
  const tronWeb = new TronWeb({
    fullHost: TRON_FULL_HOST,
    privateKey,
    headers: process.env.TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
      : {},
  });

  const fromDecimals = 6;
  const toDecimals = 6;
  const amountInRaw = Math.floor(amountIn * Math.pow(10, fromDecimals));
  const minAmountOutRaw = Math.floor(minAmountOut * Math.pow(10, toDecimals));
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  const fromAddress = TOKEN_ADDRESSES[fromToken.toUpperCase()];
  const toAddress = TOKEN_ADDRESSES[toToken.toUpperCase()];

  let txHash: string;

  // ── Cas TRX → Token TRC20 ──────────────────────────────────────────────
  if (fromToken.toUpperCase() === "TRX") {
    // swapExactETHForTokens (TRX est natif, pas besoin d'approve)
    const router = await tronWeb.contract().at(routerAddress);
    const result = await router
      .swapExactETHForTokens(minAmountOutRaw, route, tronWeb.defaultAddress.base58, deadline)
      .send({
        callValue: amountInRaw, // TRX envoyé en callValue (en SUN)
        feeLimit: 150_000_000,  // 150 TRX max fee
      });
    txHash = result;

  // ── Cas Token TRC20 → TRX ──────────────────────────────────────────────
  } else if (toToken.toUpperCase() === "TRX") {
    // Approve d'abord
    const tokenContract = await tronWeb.contract().at(fromAddress);
    await tokenContract
      .approve(routerAddress, amountInRaw)
      .send({ feeLimit: 50_000_000 });

    // swapExactTokensForETH
    const router = await tronWeb.contract().at(routerAddress);
    const result = await router
      .swapExactTokensForETH(
        amountInRaw, minAmountOutRaw, route, tronWeb.defaultAddress.base58, deadline
      )
      .send({ feeLimit: 150_000_000 });
    txHash = result;

  // ── Cas Token → Token (ex: USDT → USDC) ───────────────────────────────
  } else {
    // Approve le token source
    const tokenContract = await tronWeb.contract().at(fromAddress);
    await tokenContract
      .approve(routerAddress, amountInRaw)
      .send({ feeLimit: 50_000_000 });

    // swapExactTokensForTokens
    const router = await tronWeb.contract().at(routerAddress);
    const result = await router
      .swapExactTokensForTokens(
        amountInRaw, minAmountOutRaw, route, tronWeb.defaultAddress.base58, deadline
      )
      .send({ feeLimit: 150_000_000 });
    txHash = result;
  }

  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/swap/sunio — Obtenir un devis
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromToken = searchParams.get("from") || "USDT";
    const toToken = searchParams.get("to") || "TRX";
    const amount = parseFloat(searchParams.get("amount") || "0");
    const slippage = parseInt(searchParams.get("slippage") || "50", 10); // bps

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const quote = await getSunioQuote(fromToken, toToken, amount, slippage);

    return NextResponse.json({
      success: true,
      quote,
      supportedTokens: Object.keys(TOKEN_ADDRESSES),
      note: "slippage en points de base (ex: 50 = 0.5%, 100 = 1%)",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/swap/sunio — Exécuter le swap
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
    const fromToken: string = (body.fromToken || "USDT").toUpperCase();
    const toToken: string = (body.toToken || "TRX").toUpperCase();
    const amountIn: number = parseFloat(body.amount);
    const slippageBps: number = parseInt(body.slippage || "50", 10); // 0.5% par défaut

    if (isNaN(amountIn) || amountIn <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (fromToken === toToken) {
      return NextResponse.json({ error: "Tokens identiques" }, { status: 400 });
    }

    // 3. Récupérer l'utilisateur et sa clé TRON
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtPrivateKey: true, usdtAddress: true, name: true },
    });

    if (!user?.usdtPrivateKey || !user.usdtAddress) {
      return NextResponse.json(
        { error: "Portefeuille TRON non configuré. Veuillez générer votre adresse USDT." },
        { status: 400 }
      );
    }

    // 4. Décrypter la clé privée TRON
    let privateKey = user.usdtPrivateKey;
    if (privateKey.includes(":")) {
      try {
        privateKey = decrypt(privateKey);
      } catch {
        return NextResponse.json(
          { error: "Clé TRON invalide ou corrompue." },
          { status: 400 }
        );
      }
    }

    // 5. Vérifier le wallet source en DB
    const fromWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: fromToken } },
    });

    if (!fromWallet || fromWallet.balance < amountIn) {
      return NextResponse.json(
        {
          error: `Solde ${fromToken} insuffisant. Disponible: ${fromWallet?.balance?.toFixed(6) || 0} ${fromToken}`,
        },
        { status: 400 }
      );
    }

    // 6. Obtenir le devis Sun.io
    let quote: SunioQuoteResponse;
    try {
      quote = await getSunioQuote(fromToken, toToken, amountIn, slippageBps);
    } catch (e: any) {
      return NextResponse.json(
        { error: `Devis Sun.io indisponible: ${e.message}` },
        { status: 400 }
      );
    }

    const amountOut = parseFloat(quote.amountOut);
    const minAmountOut = parseFloat(quote.minAmountOut);

    if (!quote.routerAddress) {
      return NextResponse.json(
        { error: "Adresse du routeur Sun.io non disponible. Réessayez." },
        { status: 400 }
      );
    }

    // 7. Frais PimPay (swap = type "transfer")
    const feeConfig = await getFeeConfig();
    const { feeAmount: pimpayFee } = calculateFee(amountIn, feeConfig, "transfer");

    // 8. Débiter en DB + créer transaction PENDING
    const txRecord = await prisma.$transaction(async (tx) => {
      const freshWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromToken } },
      });
      if (!freshWallet || freshWallet.balance < amountIn) {
        throw new Error(`Solde ${fromToken} insuffisant.`);
      }

      // Débiter le wallet source
      await tx.wallet.update({
        where: { id: freshWallet.id },
        data: { balance: { decrement: amountIn } },
      });

      // Créer la transaction en PENDING
      return tx.transaction.create({
        data: {
          reference: `PIM-SWAP-${nanoid(10).toUpperCase()}`,
          amount: amountIn,
          fee: pimpayFee,
          netAmount: amountIn,
          currency: fromToken,
          type: TransactionType.SWAP,
          status: TransactionStatus.PENDING,
          statusClass: "SWAP_PENDING",
          fromUserId: userId,
          fromWalletId: freshWallet.id,
          description: `Swap ${amountIn} ${fromToken} → ~${amountOut.toFixed(6)} ${toToken} via Sun.io`,
          metadata: {
            fromToken,
            toToken,
            amountIn,
            estimatedAmountOut: amountOut,
            minAmountOut,
            slippageBps,
            priceImpact: quote.priceImpact,
            dex: "SunSwap",
            network: "TRON TRC20",
            routerAddress: quote.routerAddress,
            requestedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 9. Exécuter le swap on-chain (HORS transaction Prisma pour permettre rollback)
    let txHash: string | null = null;
    let swapError: string | null = null;

    try {
      txHash = await executeSunioSwap(
        privateKey,
        fromToken,
        toToken,
        amountIn,
        minAmountOut,
        quote.routerAddress,
        quote.route
      );
    } catch (e: any) {
      swapError = e.message;
      console.error("[SWAP_SUNIO] Erreur broadcast:", e.message);
    }

    if (txHash) {
      // ✅ Swap réussi → créditer le wallet destination + marquer SUCCESS
      await prisma.$transaction([
        prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: toToken } },
          update: { balance: { increment: amountOut } },
          create: { userId, currency: toToken, balance: amountOut, type: "CRYPTO" },
        }),
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.SUCCESS,
            statusClass: undefined,
            blockchainTx: txHash,
            description: `Swap ${amountIn} ${fromToken} → ${amountOut.toFixed(6)} ${toToken} via Sun.io`,
            metadata: {
              ...(txRecord.metadata as object),
              actualAmountOut: amountOut,
              confirmedAt: new Date().toISOString(),
              txHash,
            },
          },
        }),
        prisma.notification.create({
          data: {
            userId,
            title: "Swap effectué !",
            message: `Vous avez swappé ${amountIn} ${fromToken} contre ${amountOut.toFixed(6)} ${toToken} via Sun.io.`,
            type: "SWAP_SUCCESS",
            metadata: { fromToken, toToken, amountIn, amountOut, txHash },
          },
        }),
      ]);

      // Auto-conversion des frais PimPay
      if (pimpayFee > 0) {
        autoConvertFeeToPi(pimpayFee, fromToken, txRecord.id, txRecord.reference).catch(
          () => {}
        );
      }

      return NextResponse.json({
        success: true,
        txHash,
        fromToken,
        toToken,
        amountIn,
        amountOut,
        reference: txRecord.reference,
        message: `Swap réussi : ${amountIn} ${fromToken} → ${amountOut.toFixed(6)} ${toToken}`,
      });

    } else {
      // ❌ Swap échoué → rembourser + marquer FAILED
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId_currency: { userId, currency: fromToken } },
          data: { balance: { increment: amountIn } },
        }),
        prisma.transaction.update({
          where: { id: txRecord.id },
          data: {
            status: TransactionStatus.FAILED,
            statusClass: "SWAP_FAILED",
            description: `[ÉCHEC SWAP] ${swapError || "Erreur inconnue"}`,
          },
        }),
      ]);

      return NextResponse.json(
        {
          error: `Swap annulé : ${swapError || "Erreur blockchain"}. Votre solde a été restitué.`,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[SWAP_SUNIO] Erreur générale:", error.message);
    return NextResponse.json({ error: error.message || "Erreur" }, { status: 400 });
  }
}
