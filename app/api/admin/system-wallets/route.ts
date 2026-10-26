export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

const PI_HORIZON_URLS = [
  "https://api.mainnet.minepi.com",
  "https://api.testnet.minepi.com",
];

const XAF_RATE = 603;

/** Resout l'adresse reelle d'un wallet systeme depuis les variables d'environnement. */
function resolveWalletAddress(vars: string[]): { address: string; source: string } {
  for (const name of vars) {
    const value = process.env[name];
    if (value && value.trim()) return { address: value.trim(), source: name };
  }
  return { address: "", source: "non configuree" };
}

const WALLET_ENV_VARS: Record<string, string[]> = {
  ADMIN: ["PI_WALLET_PUBLIC_KEY", "PI_OPERATOR_ADDRESS", "PI_MASTER_WALLET_ADDRESS"],
  TREASURY: ["PI_TREASURY_WALLET_ADDRESS", "PI_COLD_WALLET_ADDRESS"],
  HOT: ["PI_HOT_WALLET_ADDRESS", "PI_MASTER_WALLET_ADDRESS"],
  LIQUIDITY: ["PI_LIQUIDITY_WALLET_ADDRESS"],
};

/**
 * Configuration des wallets systeme.
 * Les soldes sont TOUJOURS a 0 a la creation : ils sont ensuite alimentes par
 * les soldes on-chain reels (Pi Horizon) et jamais par des valeurs fictives.
 */
const DEFAULT_SYSTEM_WALLETS = [
  {
    type: "ADMIN" as const,
    name: "Admin Revenue Wallet",
    nameFr: "Revenus Admin",
    description: "Frais collectés sur toutes les transactions",
    publicAddress: resolveWalletAddress(WALLET_ENV_VARS.ADMIN).address,
    balanceUSD: 0,
    balancePi: 0,
    balanceXAF: 0,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
  },
  {
    type: "TREASURY" as const,
    name: "Treasury Secure Wallet",
    nameFr: "Trésorerie Sécurisée",
    description: "Profits à long terme et réserves stratégiques",
    publicAddress: resolveWalletAddress(WALLET_ENV_VARS.TREASURY).address,
    balanceUSD: 0,
    balancePi: 0,
    balanceXAF: 0,
    dailyLimit: 50000,
    monthlyLimit: 500000,
  },
  {
    type: "HOT" as const,
    name: "Hot Wallet",
    nameFr: "Gas & Payouts",
    description: "Fonds pour transactions automatiques et frais de gas",
    publicAddress: resolveWalletAddress(WALLET_ENV_VARS.HOT).address,
    balanceUSD: 0,
    balancePi: 0,
    balanceXAF: 0,
    dailyLimit: 75000,
    monthlyLimit: 750000,
  },
  {
    type: "LIQUIDITY" as const,
    name: "Liquidity Reserve",
    nameFr: "Réserve de Liquidité",
    description: "Buffer pour retraits USD/Orange Money",
    publicAddress: resolveWalletAddress(WALLET_ENV_VARS.LIQUIDITY).address,
    balanceUSD: 0,
    balancePi: 0,
    balanceXAF: 0,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
  },
];

/** Lit le solde native reel d'une adresse Pi/Stellar (mainnet puis testnet). */
async function fetchOnChainPiBalance(
  address: string,
): Promise<{ balance: number; network: string | null; error: string | null }> {
  if (!address || !/^G[A-Z2-7]{55}$/.test(address)) {
    return { balance: 0, network: null, error: "Adresse absente ou invalide" };
  }

  let lastError: string | null = null;

  for (const url of PI_HORIZON_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(`${url}/accounts/${address}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const network = url.includes("testnet") ? "testnet" : "mainnet";

      if (!res.ok) {
        lastError = res.status === 404 ? "Compte non activé on-chain" : `Erreur HTTP ${res.status}`;
        continue;
      }

      const account = await res.json();
      const native = account.balances?.find(
        (b: { asset_type: string }) => b.asset_type === "native",
      );
      return { balance: native ? parseFloat(native.balance) : 0, network, error: null };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : "Erreur réseau";
    }
  }

  return { balance: 0, network: null, error: lastError };
}

// GET - Fetch all system wallets (auto-creates if missing)
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Check if wallets exist, if not create them
    const existingWallets = await prisma.systemWallet.findMany();
    
    if (existingWallets.length === 0) {
      // Auto-create system wallets if they don't exist
      console.log("[SystemWallets] No wallets found, creating default wallets...");
      for (const walletData of DEFAULT_SYSTEM_WALLETS) {
        await prisma.systemWallet.create({
          data: walletData,
        });
      }
      console.log("[SystemWallets] Default wallets created successfully");
    }

    // === AUTO-REPARATION : purge des donnees mock heritees du seed ===
    // Anciennes adresses placeholder ("GAPIMPAY_..._WALLET_PI_NETWORK") et anciens
    // soldes fictifs sont remplaces par l'adresse reelle (env) et remis a zero.
    const storedWallets = await prisma.systemWallet.findMany({
      select: { id: true, type: true, publicAddress: true },
    });

    for (const w of storedWallets) {
      const isPlaceholder =
        !w.publicAddress ||
        w.publicAddress.startsWith("GAPIMPAY_") ||
        w.publicAddress.includes("NOT_CONFIGURED");

      if (!isPlaceholder) continue;

      const resolved = resolveWalletAddress(WALLET_ENV_VARS[w.type] || []);
      if (resolved.address && resolved.address !== w.publicAddress) {
        await prisma.systemWallet.update({
          where: { id: w.id },
          data: { publicAddress: resolved.address },
        });
      }
    }

    // === SOLDES REELS ON-CHAIN ===
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { consensusPrice: true },
    });
    const piPrice = systemConfig?.consensusPrice || 314159.0;

    const refreshed = await prisma.systemWallet.findMany({
      select: { id: true, type: true, publicAddress: true, balancePi: true },
    });

    const chainStatus: Record<string, { network: string | null; error: string | null; source: string }> = {};

    const onChainResults = await Promise.all(
      refreshed.map(async (w) => ({
        wallet: w,
        chain: await fetchOnChainPiBalance(w.publicAddress),
      })),
    );

    for (const { wallet: w, chain } of onChainResults) {
      chainStatus[w.type] = {
        network: chain.network,
        error: chain.error,
        source: resolveWalletAddress(WALLET_ENV_VARS[w.type] || []).source,
      };

      // Aucune donnee fiable : on ne persiste rien (on evite d'ecraser par du faux)
      if (chain.error && chain.balance === 0) {
        if (w.balancePi !== 0) {
          await prisma.systemWallet.update({
            where: { id: w.id },
            data: { balancePi: 0, balanceUSD: 0, balanceXAF: 0 },
          });
        }
        continue;
      }

      const balancePi = chain.balance;
      const balanceUSD = balancePi * piPrice;
      const balanceXAF = balanceUSD * XAF_RATE;

      if (Math.abs(w.balancePi - balancePi) > 1e-9) {
        await prisma.systemWallet.update({
          where: { id: w.id },
          data: { balancePi, balanceUSD, balanceXAF, lastActivity: new Date() },
        });
      }
    }

    const wallets = await prisma.systemWallet.findMany({
      orderBy: { type: "asc" },
      select: {
        id: true,
        type: true,
        name: true,
        nameFr: true,
        description: true,
        publicAddress: true,
        balanceUSD: true,
        balancePi: true,
        balanceXAF: true,
        dailyLimit: true,
        monthlyLimit: true,
        isLocked: true,
        lockReason: true,
        lockedAt: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate totals
    const totals = wallets.reduce(
      (acc, wallet) => ({
        totalUSD: acc.totalUSD + wallet.balanceUSD,
        totalPi: acc.totalPi + wallet.balancePi,
        totalXAF: acc.totalXAF + wallet.balanceXAF,
      }),
      { totalUSD: 0, totalPi: 0, totalXAF: 0 }
    );

    return NextResponse.json({
      success: true,
      // Chaque wallet expose l'origine de son adresse et l'etat de lecture on-chain
      wallets: wallets.map((w) => ({
        ...w,
        addressSource: chainStatus[w.type]?.source ?? "non configuree",
        addressConfigured: Boolean(w.publicAddress) && !w.publicAddress.startsWith("GAPIMPAY_"),
        onChainNetwork: chainStatus[w.type]?.network ?? null,
        onChainError: chainStatus[w.type]?.error ?? null,
        isLive: !chainStatus[w.type]?.error,
      })),
      totals,
      piPrice,
      lastSynced: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("SYSTEM_WALLETS_GET_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}

// PUT - Update a system wallet (transfer, lock, adjust limits)
export async function PUT(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { walletId, action, data } = body;

    if (!walletId || !action) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    const wallet = await prisma.systemWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet introuvable" }, { status: 404 });
    }

    let updatedWallet;

    switch (action) {
      case "lock":
        updatedWallet = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            isLocked: true,
            lockReason: data?.reason || "Bloque par admin",
            lockedAt: new Date(),
            lockedBy: payload.id,
          },
        });
        break;

      case "unlock":
        updatedWallet = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            isLocked: false,
            lockReason: null,
            lockedAt: null,
            lockedBy: null,
          },
        });
        break;

      case "adjust_limits":
        updatedWallet = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            dailyLimit: data?.dailyLimit ?? wallet.dailyLimit,
            monthlyLimit: data?.monthlyLimit ?? wallet.monthlyLimit,
          },
        });
        break;

      case "update_balance":
        // For manual balance updates (reconciliation)
        updatedWallet = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            balanceUSD: data?.balanceUSD ?? wallet.balanceUSD,
            balancePi: data?.balancePi ?? wallet.balancePi,
            balanceXAF: data?.balanceXAF ?? wallet.balanceXAF,
            lastActivity: new Date(),
          },
        });
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: payload.email || payload.username || "Admin",
        action: `SYSTEM_WALLET_${action.toUpperCase()}`,
        targetId: walletId,
        details: JSON.stringify({ walletType: wallet.type, ...data }),
      },
    });

    return NextResponse.json({
      success: true,
      wallet: updatedWallet,
    });
  } catch (error: unknown) {
    console.error("SYSTEM_WALLETS_PUT_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
