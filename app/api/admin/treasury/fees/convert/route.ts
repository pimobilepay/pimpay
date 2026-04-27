export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { verifyTotp } from "@/lib/totp";

/**
 * POST - Convert all platform fees to Pi
 * Requires 2FA verification
 * 
 * This endpoint:
 * 1. Takes all accumulated fees (USD, XAF, other currencies)
 * 2. Converts them to Pi at the current consensus rate
 * 3. Updates the Admin wallet balance
 * 4. Creates audit logs for traceability
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { totpCode, sourceBalances, targetCurrency = "PI" } = body;

    // Validate TOTP
    if (!totpCode || typeof totpCode !== "string" || totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      return NextResponse.json(
        { error: "Code 2FA invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    // Get admin for 2FA verification
    const admin = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
      return NextResponse.json(
        { error: "Google Authenticator non configure" },
        { status: 403 }
      );
    }

    // Verify TOTP
    const isValidCode = verifyTotp(admin.twoFactorSecret, totpCode);
    if (!isValidCode) {
      await prisma.securityLog.create({
        data: {
          userId: admin.id,
          action: "FEE_CONVERSION_MFA_FAILED",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
          device: req.headers.get("user-agent") || "Unknown",
        },
      });

      return NextResponse.json(
        { error: "Code 2FA incorrect" },
        { status: 401 }
      );
    }

    // Get system config for Pi price
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { consensusPrice: true },
    });
    const piPrice = systemConfig?.consensusPrice || 314159.0;
    const xafRate = 603; // XAF per USD

    // Get Admin wallet
    const adminWallet = await prisma.systemWallet.findUnique({
      where: { type: "ADMIN" },
    });

    if (!adminWallet) {
      return NextResponse.json({ error: "Wallet Admin introuvable" }, { status: 404 });
    }

    // Check if wallet is locked
    if (adminWallet.isLocked) {
      return NextResponse.json({ error: "Wallet Admin bloque" }, { status: 403 });
    }

    // Calculate conversion amounts
    // Source balances: { usd: number, xaf: number, otherCrypto: { currency: string, amount: number }[] }
    const usdToConvert = sourceBalances?.usd || adminWallet.balanceUSD;
    const xafToConvert = sourceBalances?.xaf || adminWallet.balanceXAF;

    // Convert USD to Pi
    const usdToPi = usdToConvert / piPrice;
    
    // Convert XAF to Pi (XAF -> USD -> Pi)
    const xafToUsd = xafToConvert / xafRate;
    const xafToPi = xafToUsd / piPrice;

    // Total Pi gained
    const totalPiConverted = usdToPi + xafToPi;

    // Update Admin wallet balances
    const updatedWallet = await prisma.systemWallet.update({
      where: { type: "ADMIN" },
      data: {
        balanceUSD: 0, // All USD converted
        balanceXAF: 0, // All XAF converted
        balancePi: { increment: totalPiConverted },
        lastActivity: new Date(),
      },
    });

    // Create conversion record transaction
    const conversionRef = `CONV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    await prisma.transaction.create({
      data: {
        reference: conversionRef,
        amount: totalPiConverted,
        fee: 0,
        netAmount: totalPiConverted,
        type: "EXCHANGE",
        status: "SUCCESS",
        currency: "PI",
        description: `Conversion automatique des frais plateforme en Pi`,
        metadata: {
          conversionType: "PLATFORM_FEE_CONVERSION",
          sourceUSD: usdToConvert,
          sourceXAF: xafToConvert,
          piPriceUsed: piPrice,
          xafRateUsed: xafRate,
          totalPiConverted,
          convertedAt: new Date().toISOString(),
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.email || admin.username || "Admin",
        action: "PLATFORM_FEE_CONVERSION",
        targetId: adminWallet.id,
        details: JSON.stringify({
          sourceUSD: usdToConvert,
          sourceXAF: xafToConvert,
          totalPiConverted,
          piPriceUsed: piPrice,
          xafRateUsed: xafRate,
          newBalancePi: updatedWallet.balancePi,
          conversionReference: conversionRef,
          mfaVerified: true,
        }),
      },
    });

    // Security log
    await prisma.securityLog.create({
      data: {
        userId: admin.id,
        action: "PLATFORM_FEE_CONVERSION_SUCCESS",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
        device: req.headers.get("user-agent") || "Unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conversion effectuee avec succes",
      data: {
        conversionReference: conversionRef,
        converted: {
          fromUSD: usdToConvert,
          fromXAF: xafToConvert,
          toPi: totalPiConverted,
        },
        rates: {
          piPrice,
          xafRate,
        },
        newBalance: {
          usd: updatedWallet.balanceUSD,
          xaf: updatedWallet.balanceXAF,
          pi: updatedWallet.balancePi,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("FEE_CONVERSION_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
