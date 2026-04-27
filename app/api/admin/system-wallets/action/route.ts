export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { verifyTotp } from "@/lib/totp";

/**
 * POST - Execute a secured action on system wallets with MFA verification
 * All actions require Google Authenticator TOTP code
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { walletId, action, totpCode, data } = body;

    if (!walletId || !action || !totpCode) {
      return NextResponse.json(
        { error: "Donnees manquantes (walletId, action, totpCode requis)" },
        { status: 400 }
      );
    }

    // Validate TOTP code format
    if (typeof totpCode !== "string" || totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      return NextResponse.json(
        { error: "Code 2FA invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    // Get admin user to verify 2FA
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

    if (!admin) {
      return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });
    }

    // Verify 2FA is enabled
    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      return NextResponse.json(
        { error: "Google Authenticator n'est pas configure. Veuillez l'activer dans les parametres de securite." },
        { status: 403 }
      );
    }

    // Verify TOTP code
    const isValidCode = verifyTotp(admin.twoFactorSecret, totpCode);
    if (!isValidCode) {
      // Log failed attempt
      await prisma.securityLog.create({
        data: {
          userId: admin.id,
          action: "MFA_VERIFICATION_FAILED",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
          device: req.headers.get("user-agent") || "Unknown",
        },
      });

      return NextResponse.json(
        { error: "Code 2FA incorrect. Verifiez votre application Google Authenticator." },
        { status: 401 }
      );
    }

    // Get the target wallet
    const wallet = await prisma.systemWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet introuvable" }, { status: 404 });
    }

    // Execute the action based on type
    let result;
    let actionDescription = "";

    switch (action) {
      case "transfer": {
        // Transfer funds to treasury wallet
        const { amount, currency = "USD" } = data || {};
        
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }

        const treasuryWallet = await prisma.systemWallet.findUnique({
          where: { type: "TREASURY" },
        });

        if (!treasuryWallet) {
          return NextResponse.json({ error: "Wallet tresorerie introuvable" }, { status: 404 });
        }

        // Check if source has sufficient balance
        const balanceField = currency === "PI" ? "balancePi" : currency === "XAF" ? "balanceXAF" : "balanceUSD";
        if ((wallet as Record<string, number>)[balanceField] < amount) {
          return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
        }

        // Perform transfer in transaction
        result = await prisma.$transaction([
          prisma.systemWallet.update({
            where: { id: wallet.id },
            data: {
              [balanceField]: { decrement: amount },
              lastActivity: new Date(),
            },
          }),
          prisma.systemWallet.update({
            where: { id: treasuryWallet.id },
            data: {
              [balanceField]: { increment: amount },
              lastActivity: new Date(),
            },
          }),
        ]);

        actionDescription = `Transfert de ${amount} ${currency} vers Tresorerie`;
        break;
      }

      case "block": {
        const { reason } = data || {};
        
        result = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            isLocked: true,
            lockReason: reason || "Bloque par admin avec 2FA",
            lockedAt: new Date(),
            lockedBy: admin.id,
          },
        });

        actionDescription = `Wallet ${wallet.nameFr} bloque`;
        break;
      }

      case "unblock": {
        result = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            isLocked: false,
            lockReason: null,
            lockedAt: null,
            lockedBy: null,
          },
        });

        actionDescription = `Wallet ${wallet.nameFr} debloque`;
        break;
      }

      case "adjust": {
        const { dailyLimit, monthlyLimit } = data || {};
        
        result = await prisma.systemWallet.update({
          where: { id: walletId },
          data: {
            dailyLimit: dailyLimit ?? wallet.dailyLimit,
            monthlyLimit: monthlyLimit ?? wallet.monthlyLimit,
            lastActivity: new Date(),
          },
        });

        actionDescription = `Limites ajustees pour ${wallet.nameFr}`;
        break;
      }

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    // Log successful action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.email || admin.username || "Admin",
        action: `SYSTEM_WALLET_${action.toUpperCase()}_MFA`,
        targetId: walletId,
        details: JSON.stringify({
          walletType: wallet.type,
          walletName: wallet.nameFr,
          ...data,
          mfaVerified: true,
        }),
      },
    });

    // Create security log
    await prisma.securityLog.create({
      data: {
        userId: admin.id,
        action: `TREASURY_ACTION_${action.toUpperCase()}`,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
        device: req.headers.get("user-agent") || "Unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: actionDescription,
      result,
    });
  } catch (error: unknown) {
    console.error("SYSTEM_WALLET_ACTION_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
