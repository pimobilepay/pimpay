export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Default system wallets configuration
const DEFAULT_SYSTEM_WALLETS = [
  {
    type: "ADMIN" as const,
    name: "Admin Revenue Wallet",
    nameFr: "Revenus Admin",
    description: "Frais collectés sur toutes les transactions",
    publicAddress: "GAPIMPAY_ADMIN_WALLET_PI_NETWORK",
    balanceUSD: 14250.45,
    balancePi: 8542.75,
    balanceXAF: 8750000,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
  },
  {
    type: "TREASURY" as const,
    name: "Treasury Secure Wallet",
    nameFr: "Trésorerie Sécurisée",
    description: "Profits à long terme et réserves stratégiques",
    publicAddress: "GAPIMPAY_TREASURY_WALLET_PI_NETWORK",
    balanceUSD: 85000.00,
    balancePi: 45000.00,
    balanceXAF: 52000000,
    dailyLimit: 50000,
    monthlyLimit: 500000,
  },
  {
    type: "HOT" as const,
    name: "Hot Wallet",
    nameFr: "Gas & Payouts",
    description: "Fonds pour transactions automatiques et frais de gas",
    publicAddress: "GAPIMPAY_HOT_WALLET_PI_NETWORK",
    balanceUSD: 5420.80,
    balancePi: 3200.50,
    balanceXAF: 3250000,
    dailyLimit: 75000,
    monthlyLimit: 750000,
  },
  {
    type: "LIQUIDITY" as const,
    name: "Liquidity Reserve",
    nameFr: "Réserve de Liquidité",
    description: "Buffer pour retraits USD/Orange Money",
    publicAddress: "GAPIMPAY_LIQUIDITY_WALLET_PI_NETWORK",
    balanceUSD: 25000.00,
    balancePi: 12500.00,
    balanceXAF: 15000000,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
  },
];

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
      wallets,
      totals,
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
