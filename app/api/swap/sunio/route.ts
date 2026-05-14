/**
 * ============================================================
 * POST /api/swap/sunio
 * ============================================================
 * Swap de tokens sur TRON via le Smart Router Sun.io (sun.io — DEX Tron)
 *
 * ⚠️  Sun.io n'expose PAS d'API REST publique de quote.
 *     Le prix est calculé via CoinGecko (déjà utilisé dans le projet),
 *     et le swap est exécuté on-chain via le contrat Smart Router TRON.
 *
 * Contrat Smart Router mainnet : TCFNp179Lg46D16zKoumd4Poa2WFFdtxYj
 * Doc officielle : https://docs.sun.io/developers/swap/smart-router
 * Source contrat : https://github.com/sun-protocol/smart-exchange-router
 *
 * Flow :
 *   1. GET /api/swap/sunio?from=USDT&to=TRX&amount=X → prix via CoinGecko
 *   2. POST /api/swap/sunio → exécute swapExactInput on-chain via TronWeb
 *
 * ⚠️  Nécessite :
 *   - La clé privée TRON de l'utilisateur (usdtPrivateKey en DB)
 *   - Un solde TRX suffisant pour les frais (~20 TRX recommandé)
 *   - TRONGRID_API_KEY dans les variables d'environnement
 *     → Obtenir une clé gratuite : https://www.trongrid.io/
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

/**
 * Adresse du contrat Smart Router Sun.io sur le mainnet TRON.
 * Source : https://docs.sun.io/developers/swap/smart-router
 * Historique des contrats :
 *   - TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj  ← ACTUEL (depuis sept. 2024)
 *   - TJ4NNy8xZEqsowCBhLvZ45LCqPdGjkET5j  (déprécié)
 *   - TFVisXFaijZfeyeSjCEVkHfex7HGdTxzF9   (déprécié)
 */
const SMART_ROUTER_ADDRESS = "TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj";

/**
 * Clé TronGrid — utilisée par TronWeb pour broadcaster les txs on-chain.
 * À définir dans .env : TRONGRID_API_KEY=xxxxxxxx
 * Obtenir une clé gratuite : https://www.trongrid.io/
 */
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || "";

const TRON_FULL_HOST = "https://api.trongrid.io";

/**
 * Adresses des tokens TRC20 courants sur TRON mainnet.
 * Source : https://tronscan.org
 */
const TOKEN_ADDRESSES: Record<string, string> = {
  TRX:  "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", // adresse native TRX (convention Sun.io)
  USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  USDC: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
  USDD: "TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn",
  WTRX: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
  JST:  "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9",
  SUN:  "TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S",
  BTT:  "TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4",
  WIN:  "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
  NFT:  "TFczxzPhnThNSqr5by8tvxsdCFRg8vFn4F",
};

/**
 * Mapping CoinGecko ID pour chaque token supporté.
 */
const COINGECKO_IDS: Record<string, string> = {
  TRX:  "tron",
  USDT: "tether",
  USDC: "usd-coin",
  USDD: "usdd",
  JST:  "just",
  SUN:  "sun-token",
  BTT:  "bittorrent",
  WIN:  "wink",
  WTRX: "tron",
};

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
 * Calcule le prix de swap via CoinGecko.
 * Sun.io n'expose pas d'API REST publique de quote — le prix on-chain
 * est calculé par le contrat Smart Router au moment de l'exécution.
 * On utilise CoinGecko comme oracle de prix pour l'estimation du devis.
 */
async function getSunioQuote(
  fromToken: string,
  toToken: string,
  amountIn: number,
  slippageBps: number = 100 // 1% par défaut
): Promise<SunioQuoteResponse> {
  const fromAddress = TOKEN_ADDRESSES[fromToken.toUpperCase()];
  const toAddress = TOKEN_ADDRESSES[toToken.toUpperCase()];

  if (!fromAddress) throw new Error(`Token source non supporté: ${fromToken}`);
  if (!toAddress) throw new Error(`Token destination non supporté: ${toToken}`);

  // Récupérer les prix USD via CoinGecko
  const fromId = COINGECKO_IDS[fromToken.toUpperCase()];
  const toId   = COINGECKO_IDS[toToken.toUpperCase()];

  if (!fromId || !toId) {
    throw new Error(`Pas de price feed CoinGecko pour ${fromToken} ou ${toToken}`);
  }

  const ids = [...new Set([fromId, toId])].join(",");
  const cgRes = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { signal: AbortSignal.timeout(8_000) }
  );

  if (!cgRes.ok) throw new Error(`CoinGecko erreur ${cgRes.status}`);
  const prices = await cgRes.json();

  const fromUsd = prices[fromId]?.usd;
  const toUsd   = prices[toId]?.usd;

  if (!fromUsd || !toUsd) {
    throw new Error("Prix indisponibles via CoinGecko, réessayez dans quelques secondes.");
  }

  const slippagePct   = slippageBps / 10_000;            // ex: 100 bps → 0.01
  const FEE_PCT       = 0.003;                            // 0.3% frais Sun.io estimés
  const amountOut     = (amountIn * fromUsd) / toUsd * (1 - FEE_PCT);
  const minAmountOut  = amountOut * (1 - slippagePct);
  const priceImpact   = "0.30";                           // estimation (frais pool)

  return {
    fromToken:    fromToken.toUpperCase(),
    toToken:      toToken.toUpperCase(),
    amountIn:     amountIn.toString(),
    amountOut:    amountOut.toFixed(6),
    priceImpact,
    route:        [fromAddress, toAddress],
    routerAddress: SMART_ROUTER_ADDRESS,
    minAmountOut: minAmountOut.toFixed(6),
    fee:          (amountIn * FEE_PCT).toFixed(6),
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
    // TRON-PRO-API-KEY est le header correct pour api.trongrid.io
    headers: TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": TRONGRID_API_KEY }
      : {},
  });

  const decimals = 6;
  const amountInRaw     = Math.floor(amountIn    * Math.pow(10, decimals)).toString();
  const minAmountOutRaw = Math.floor(minAmountOut * Math.pow(10, decimals)).toString();
  const deadline        = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  const fromAddress = TOKEN_ADDRESSES[fromToken.toUpperCase()];
  const toAddress   = TOKEN_ADDRESSES[toToken.toUpperCase()];

  const isTRXin  = fromToken.toUpperCase() === "TRX";
  const isTRXout = toToken.toUpperCase()   === "TRX";

  // ── Approve si le token source est un TRC20 (pas TRX natif) ────────────
  if (!isTRXin) {
    const tokenContract = await tronWeb.contract().at(fromAddress);
    await tokenContract
      .approve(routerAddress, amountInRaw)
      .send({ feeLimit: 50_000_000 });
  }

  /**
   * Le contrat Smart Router Sun.io expose une unique fonction d'entrée :
   *   swapExactInput(path, poolVersion, versionLen, fees, swapData)
   *
   * Pour une paire simple (ex: USDT → TRX) sans multi-hop :
   *   - path        : [adresseFrom, adresseTo]
   *   - poolVersion : ["v2"] (SunSwap V2, le plus liquide pour TRX/USDT)
   *   - versionLen  : [2]    (nombre d'adresses dans path)
   *   - fees        : [0, 0] (non utilisé pour V2)
   *   - swapData    : [amountIn, minAmountOut, destinataire, deadline]
   *
   * Source : https://docs.sun.io/developers/swap/smart-router
   *          https://github.com/sun-protocol/smart-exchange-router
   */
  const router = await tronWeb.contract().at(routerAddress);

  const result = await router
    .swapExactInput(
      [fromAddress, toAddress],   // path
      ["v2"],                     // poolVersion — V2 couvre TRX↔USDT, TRX↔USDC
      [2],                        // versionLen — 2 tokens dans le path
      [0, 0],                     // fees — non utilisé en V2
      [
        amountInRaw,              // amountIn (en unités de base, 6 décimales)
        minAmountOutRaw,          // amountOutMin (slippage appliqué)
        tronWeb.defaultAddress.base58, // destinataire = wallet de l'utilisateur
        deadline,                 // timestamp limite
      ]
    )
    .send({
      callValue: isTRXin ? amountInRaw : 0, // TRX natif envoyé en callValue si TRX → token
      feeLimit: 200_000_000,                 // 200 TRX max (énergie TRON)
    });

  return result;
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
