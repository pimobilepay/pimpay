export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// GET - Fetch all system wallets
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
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
