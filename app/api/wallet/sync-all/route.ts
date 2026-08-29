export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/wallet/sync-all
 *
 * Synchronise TOUS les soldes crypto on-chain de l'utilisateur en une requete.
 *
 * ⚠️ Avant correction cette route ne couvrait que BNB, TRX et USDT alors que
 * 14 actifs ont une detection de depot reelle. Les depots BTC, ETH, SOL, XRP,
 * XLM, USDC, DAI, BUSD, EURC et OUSD n'etaient donc jamais credites par la
 * synchronisation globale.
 *
 * Couverture actuelle (alignee sur lib/crypto-config.ts → SYNC_ENDPOINTS) :
 *   - EVM   (sidraAddress) : ETH, BNB, USDC, DAI, BUSD, EURC, OUSD
 *   - TRON  (usdtAddress)  : TRX, USDT
 *   - BTC   (walletAddress)
 *   - SOL   (solAddress)
 *   - XRP   (xrpAddress)
 *   - XLM   (xlmAddress)
 *
 * SDA est exclu : il a sa propre route dediee (/api/wallet/sidra/sync) avec une
 * logique de reconciliation specifique a la Sidra Chain.
 * PI est exclu : ses depots passent par le SDK Pi Network (/api/pi/*).
 * ADA et TON sont exclus : aucune adresse dediee en base (cf.
 * UNSUPPORTED_ONCHAIN_ASSETS), un depot y serait irrecuperable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { creditOnchainDeposit } from "@/lib/blockchain/credit-deposit";
import { getDogeBalance, generateDogeWallet } from "@/lib/blockchain/dogecoin";
import { encrypt } from "@/lib/encryption";
import { getBnbBalance } from "@/lib/blockchain/bnb";
import { getTrxBalance, getUsdtBalance, USDT_TRC20_CONTRACT } from "@/lib/blockchain/tron";
import {
  getBtcBalance,
  getSolBalance,
  getXrpBalance,
  getXlmBalance,
  getEthBalance,
  getEvmTokenBalance,
  BSC_TOKENS,
} from "@/lib/blockchain/balances";

interface SyncResult {
  currency: string;
  success: boolean;
  total: number;
  added: number;
  message: string;
  reference?: string;
}

/** Definition declarative d'un actif synchronisable. */
interface AssetSyncSpec {
  currency: string;
  /** Champ d'adresse Prisma requis pour lire le solde on-chain. */
  addressField: "sidraAddress" | "usdtAddress" | "walletAddress" | "solAddress" | "xrpAddress" | "xlmAddress" | "dogeAddress";
  network: string;
  source: string;
  decimals: number;
  minDeposit: number;
  /** Lit le solde on-chain. Retourne null si le reseau est indisponible. */
  read: (address: string) => Promise<number | null>;
  extraMetadata?: Record<string, unknown>;
}

const ASSET_SPECS: AssetSyncSpec[] = [
  // ── EVM natifs ────────────────────────────────────────────────────────────
  {
    currency: "ETH",
    addressField: "sidraAddress",
    network: "Ethereum",
    source: "ETH_MAINNET",
    decimals: 8,
    minDeposit: 0.00001,
    read: getEthBalance,
  },
  {
    currency: "BNB",
    addressField: "sidraAddress",
    network: "BSC (BEP20)",
    source: "BSC_MAINNET",
    decimals: 8,
    minDeposit: 0.0001,
    read: async (a) => {
      const v = await getBnbBalance(a);
      const n = parseFloat(String(v));
      return isNaN(n) ? null : n;
    },
  },

  {
    currency: "DOGE",
    addressField: "dogeAddress",
    network: "Dogecoin Mainnet",
    source: "DOGE_MAINNET",
    decimals: 8,
    minDeposit: 0.01,
    read: getDogeBalance,
  },

  // ── Stablecoins EVM (ERC20 / BEP20) ───────────────────────────────────────
  {
    currency: "USDC",
    addressField: "sidraAddress",
    network: "BSC (BEP20)",
    source: "BSC_MAINNET",
    decimals: 4,
    minDeposit: 0.01,
    read: (a) => getEvmTokenBalance(a, "USDC"),
    extraMetadata: { contractAddress: BSC_TOKENS.USDC.contract },
  },
  {
    currency: "DAI",
    addressField: "sidraAddress",
    network: "BSC (BEP20)",
    source: "BSC_MAINNET",
    decimals: 4,
    minDeposit: 0.01,
    read: (a) => getEvmTokenBalance(a, "DAI"),
    extraMetadata: { contractAddress: BSC_TOKENS.DAI.contract },
  },
  {
    currency: "BUSD",
    addressField: "sidraAddress",
    network: "BSC (BEP20)",
    source: "BSC_MAINNET",
    decimals: 4,
    minDeposit: 0.01,
    read: (a) => getEvmTokenBalance(a, "BUSD"),
    extraMetadata: { contractAddress: BSC_TOKENS.BUSD.contract },
  },
  {
    currency: "EURC",
    addressField: "sidraAddress",
    network: "Ethereum (ERC20)",
    source: "ETH_MAINNET",
    decimals: 4,
    minDeposit: 0.01,
    read: (a) => getEvmTokenBalance(a, "EURC"),
    extraMetadata: { contractAddress: BSC_TOKENS.EURC.contract },
  },
  {
    currency: "OUSD",
    addressField: "sidraAddress",
    network: "Ethereum (ERC20)",
    source: "ETH_MAINNET",
    decimals: 4,
    minDeposit: 0.01,
    read: (a) => getEvmTokenBalance(a, "OUSD"),
    extraMetadata: { contractAddress: BSC_TOKENS.OUSD.contract },
  },

  // ── TRON ──────────────────────────────────────────────────────────────────
  {
    currency: "TRX",
    addressField: "usdtAddress",
    network: "TRON",
    source: "TRON_MAINNET",
    decimals: 6,
    minDeposit: 0.001,
    read: getTrxBalance,
  },
  {
    currency: "USDT",
    addressField: "usdtAddress",
    network: "TRC20 (TRON)",
    source: "TRON_MAINNET",
    decimals: 6,
    minDeposit: 0.01,
    read: getUsdtBalance,
    extraMetadata: { contractAddress: USDT_TRC20_CONTRACT },
  },

  // ── Chaines natives ───────────────────────────────────────────────────────
  {
    currency: "BTC",
    addressField: "walletAddress",
    network: "Bitcoin",
    source: "BTC_MAINNET",
    decimals: 8,
    minDeposit: 0.00000546, // dust limit Bitcoin
    read: getBtcBalance,
  },
  {
    currency: "SOL",
    addressField: "solAddress",
    network: "Solana",
    source: "SOLANA_MAINNET",
    decimals: 8,
    minDeposit: 0.000001,
    read: getSolBalance,
  },
  {
    currency: "XRP",
    addressField: "xrpAddress",
    network: "XRP Ledger",
    source: "XRP_MAINNET",
    decimals: 6,
    minDeposit: 0.000001,
    read: getXrpBalance,
  },
  {
    currency: "XLM",
    addressField: "xlmAddress",
    network: "Stellar",
    source: "STELLAR_MAINNET",
    decimals: 7,
    minDeposit: 0.0000001,
    read: getXlmBalance,
  },
];

export async function POST() {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ── 2. Adresses de l'utilisateur ─────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sidraAddress: true,   // EVM  : ETH, BNB, USDC, DAI, BUSD, EURC, OUSD
        usdtAddress: true,    // TRON : TRX, USDT
        walletAddress: true,  // BTC
        solAddress: true,     // SOL
        xrpAddress: true,     // XRP
        xlmAddress: true,     // XLM
        dogeAddress: true,    // DOGE natif
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    let dogeAddress = user.dogeAddress;
    if (!dogeAddress) {
      const generated = generateDogeWallet();
      const updated = await prisma.user.updateMany({
        where: { id: userId, dogeAddress: null },
        data: { dogeAddress: generated.address, dogePrivateKey: encrypt(generated.privateKeyWIF) },
      });
      dogeAddress = updated.count > 0
        ? generated.address
        : (await prisma.user.findUnique({ where: { id: userId }, select: { dogeAddress: true } }))?.dogeAddress;
    }

    // ── 3. Lecture on-chain en PARALLELE (les RPC sont independants) ──────────
    // On lit d'abord tous les soldes en parallele pour la latence, puis on
    // credite en SERIE : creditOnchainDeposit ouvre une transaction Prisma et
    // les paralleliser epuiserait le pool de connexions.
    const reads = await Promise.all(
      ASSET_SPECS.map(async (spec) => {
        const address = spec.currency === "DOGE" ? dogeAddress : user[spec.addressField];
        if (!address) {
          return { spec, address: null, balance: null, failed: false };
        }
        try {
          const balance = await spec.read(address);
          return { spec, address, balance, failed: balance === null };
        } catch (err: any) {
          console.error(`[SYNC_ALL] ${spec.currency} read error:`, err?.message);
          return { spec, address, balance: null, failed: true };
        }
      })
    );

    // ── 4. Credit sequentiel ─────────────────────────────────────────────────
    const results: SyncResult[] = [];

    for (const { spec, address, balance, failed } of reads) {
      if (!address) {
        results.push({
          currency: spec.currency,
          success: true,
          total: 0,
          added: 0,
          message: `Aucune adresse ${spec.network} configuree`,
        });
        continue;
      }

      if (failed || balance === null) {
        const existing = await prisma.wallet.findUnique({
          where: { userId_currency: { userId, currency: spec.currency } },
        });
        results.push({
          currency: spec.currency,
          success: false,
          total: existing?.balance ?? 0,
          added: 0,
          message: `Reseau ${spec.network} indisponible`,
        });
        continue;
      }

      try {
        const credited = await creditOnchainDeposit({
          userId,
          currency: spec.currency,
          blockchainBalance: balance,
          network: spec.network,
          source: spec.source,
          decimals: spec.decimals,
          minDeposit: spec.minDeposit,
          extraMetadata: (spec.extraMetadata ?? {}) as any,
        });

        results.push({
          currency: spec.currency,
          success: true,
          total: credited.total,
          added: credited.added,
          reference: credited.reference ?? undefined,
          message:
            credited.added > 0
              ? `Depot detecte (+${credited.added.toFixed(spec.decimals)} ${spec.currency})`
              : "Solde deja a jour",
        });
      } catch (err: any) {
        console.error(`[SYNC_ALL] ${spec.currency} credit error:`, err?.message);
        results.push({
          currency: spec.currency,
          success: false,
          total: 0,
          added: 0,
          message: `Erreur lors du credit ${spec.currency}`,
        });
      }
    }

    // ── 5. Resume ────────────────────────────────────────────────────────────
    const totalAdded = results.reduce((sum, r) => sum + (r.added > 0 ? r.added : 0), 0);
    const successCount = results.filter((r) => r.success).length;
    const deposits = results.filter((r) => r.added > 0);

    return NextResponse.json({
      success: true,
      summary: {
        synced: successCount,
        total: results.length,
        totalAdded,
        depositsDetected: deposits.length,
      },
      results,
    });
  } catch (err: any) {
    console.error("[SYNC_ALL_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation des wallets" },
      { status: 500 }
    );
  }
}
