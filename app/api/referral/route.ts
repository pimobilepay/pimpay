export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper to get referral config from SystemConfig
async function getReferralConfig() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { referralBonus: true, referralWelcomeBonus: true }
    });
    return {
      referralBonus: config?.referralBonus ?? 0.0005,
      referralWelcomeBonus: config?.referralWelcomeBonus ?? 0.00025
    };
  } catch {
    return { referralBonus: 0.0005, referralWelcomeBonus: 0.00025 };
  }
}

// GET - Fetch referral stats for the current user
export async function GET() {
  try {
    const currentUser = await auth();
    if (!currentUser) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const userId = currentUser.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referredById: true,
        referrals: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Get referral bonus from centralized config
    const referralConfig = await getReferralConfig();
    const totalReferrals = user.referrals.length;
    const rewardPerReferral = referralConfig.referralBonus;
    const totalRewards = totalReferrals * rewardPerReferral;

    return NextResponse.json({
      success: true,
      referralCode: user.referralCode,
      referrals: user.referrals,
      totalReferrals,
      rewardPerReferral,
      totalRewards,
      hasBeenReferred: !!user.referredById,
    });
  } catch (error: any) {
    console.error("REFERRAL_GET_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Apply a referral code
export async function POST(req: Request) {
  try {
    const currentAuthUser = await auth();
    if (!currentAuthUser) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const userId = currentAuthUser.id;

    const body = await req.json().catch(() => ({}));
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json({ error: "Code de parrainage requis" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referredById: true, referralCode: true, username: true },
    });

    if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (currentUser.referredById) {
      return NextResponse.json({ error: "Vous avez déjà un parrain" }, { status: 400 });
    }

    if (currentUser.referralCode === referralCode) {
      return NextResponse.json({ error: "Vous ne pouvez pas utiliser votre propre code" }, { status: 400 });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, username: true, name: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 404 });
    }

    // Get referral config from centralized settings
    const referralConfig = await getReferralConfig();
    const { referralBonus, referralWelcomeBonus } = referralConfig;

    // Apply referral
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    // Grant bonus to referrer
    const referrerPiWallet = await prisma.wallet.findFirst({
      where: { userId: referrer.id, currency: "PI" },
    });

    if (referrerPiWallet) {
      await prisma.wallet.update({
        where: { id: referrerPiWallet.id },
        data: { balance: { increment: referralBonus } },
      });

      await prisma.transaction.create({
        data: {
          reference: `REF-BONUS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          amount: referralBonus,
          currency: "PI",
          type: "AIRDROP",
          status: "SUCCESS",
          description: `Bonus parrainage - Filleul: ${currentUser.username || currentUser.id.slice(0, 8)}`,
          toUserId: referrer.id,
          toWalletId: referrerPiWallet.id,
        },
      });
    }

    // Grant bonus to new user
    const userPiWallet = await prisma.wallet.findFirst({
      where: { userId, currency: "PI" },
    });

    if (userPiWallet) {
      await prisma.wallet.update({
        where: { id: userPiWallet.id },
        data: { balance: { increment: referralWelcomeBonus } },
      });

      await prisma.transaction.create({
        data: {
          reference: `REF-WELCOME-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          amount: referralWelcomeBonus,
          currency: "PI",
          type: "AIRDROP",
          status: "SUCCESS",
          description: `Bonus de bienvenue - Parrain: ${referrer.username || referrer.id.slice(0, 8)}`,
          toUserId: userId,
          toWalletId: userPiWallet.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Parrainage appliqué ! Bonus: +${referralWelcomeBonus} PI pour vous, +${referralBonus} PI pour ${referrer.name || referrer.username}`,
      referrerName: referrer.name || referrer.username,
    });
  } catch (error: any) {
    console.error("REFERRAL_POST_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
