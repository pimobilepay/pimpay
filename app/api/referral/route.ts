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
            kycStatus: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Get referral bonus from centralized config
    const referralConfig = await getReferralConfig();
    const rewardPerReferral = referralConfig.referralBonus;

    // Check eligibility for each referral and if bonus was already granted
    const referralsWithStatus = await Promise.all(
      user.referrals.map(async (referral) => {
        const kycApproved = referral.kycStatus === "VERIFIED" || referral.kycStatus === "APPROVED";
        
        // Check if has deposit
        const hasDeposit = await prisma.transaction.findFirst({
          where: {
            toUserId: referral.id,
            type: "DEPOSIT",
            status: "SUCCESS",
          },
        });
        
        // Check if bonus was already granted for this referral
        const bonusGranted = await prisma.transaction.findFirst({
          where: {
            toUserId: userId,
            type: "AIRDROP",
            reference: { startsWith: `REF-BONUS-${referral.id}` },
          },
        });
        
        const eligible = kycApproved && !!hasDeposit;
        
        return {
          id: referral.id,
          name: referral.name,
          username: referral.username,
          avatar: referral.avatar,
          createdAt: referral.createdAt,
          kycApproved,
          hasDeposit: !!hasDeposit,
          eligible,
          bonusGranted: !!bonusGranted,
          status: bonusGranted ? "completed" : (eligible ? "pending" : "waiting"),
        };
      })
    );

    const totalReferrals = user.referrals.length;
    const eligibleReferrals = referralsWithStatus.filter(r => r.bonusGranted).length;
    const pendingReferrals = referralsWithStatus.filter(r => !r.bonusGranted).length;
    const totalRewards = eligibleReferrals * rewardPerReferral;

    return NextResponse.json({
      success: true,
      referralCode: user.referralCode,
      referrals: referralsWithStatus,
      totalReferrals,
      eligibleReferrals,
      pendingReferrals,
      rewardPerReferral,
      totalRewards,
      hasBeenReferred: !!user.referredById,
    });
  } catch (error: any) {
    console.error("REFERRAL_GET_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Helper to check if user is eligible for referral bonus (KYC verified + first deposit)
async function checkReferralEligibility(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  
  // Check KYC status
  const kycApproved = user?.kycStatus === "VERIFIED" || user?.kycStatus === "APPROVED";
  
  // Check if user has made at least one successful deposit
  const hasDeposit = await prisma.transaction.findFirst({
    where: {
      toUserId: userId,
      type: "DEPOSIT",
      status: "SUCCESS",
    },
  });
  
  return { kycApproved, hasDeposit: !!hasDeposit, eligible: kycApproved && !!hasDeposit };
}

// Helper to grant referrer bonus when conditions are met
export async function grantReferrerBonusIfEligible(userId: string) {
  try {
    // Get the user and their referrer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        username: true, 
        referredById: true,
        kycStatus: true,
      },
    });
    
    if (!user?.referredById) return { granted: false, reason: "No referrer" };
    
    // Check if already granted (look for existing bonus transaction)
    const existingBonus = await prisma.transaction.findFirst({
      where: {
        toUserId: user.referredById,
        type: "AIRDROP",
        reference: { startsWith: `REF-BONUS-${userId}` },
      },
    });
    
    if (existingBonus) return { granted: false, reason: "Bonus already granted" };
    
    // Check eligibility
    const { eligible, kycApproved, hasDeposit } = await checkReferralEligibility(userId);
    
    if (!eligible) {
      return { 
        granted: false, 
        reason: !kycApproved ? "KYC not verified" : "No deposit yet",
        kycApproved,
        hasDeposit,
      };
    }
    
    // Get referral config
    const referralConfig = await getReferralConfig();
    const { referralBonus } = referralConfig;
    
    // Grant bonus to referrer
    const referrerPiWallet = await prisma.wallet.findFirst({
      where: { userId: user.referredById, currency: "PI" },
    });
    
    if (referrerPiWallet) {
      await prisma.wallet.update({
        where: { id: referrerPiWallet.id },
        data: { balance: { increment: referralBonus } },
      });
      
      await prisma.transaction.create({
        data: {
          reference: `REF-BONUS-${userId}-${Date.now()}`,
          amount: referralBonus,
          currency: "PI",
          type: "AIRDROP",
          status: "SUCCESS",
          description: `Bonus parrainage - Filleul: ${user.username || user.id.slice(0, 8)} (KYC + Depot valides)`,
          toUserId: user.referredById,
          toWalletId: referrerPiWallet.id,
        },
      });
      
      return { granted: true, amount: referralBonus };
    }
    
    return { granted: false, reason: "Referrer wallet not found" };
  } catch (error) {
    console.error("GRANT_REFERRER_BONUS_ERROR:", error);
    return { granted: false, reason: "Error" };
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
      select: { id: true, referredById: true, referralCode: true, username: true, kycStatus: true },
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

    // Apply referral (link accounts)
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    // Grant welcome bonus to new user immediately
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

    // Check if referrer bonus can be granted immediately (if user already has KYC + deposit)
    const eligibility = await checkReferralEligibility(userId);
    let referrerBonusMessage = "";
    
    if (eligibility.eligible) {
      // User already has KYC and deposit, grant referrer bonus now
      await grantReferrerBonusIfEligible(userId);
      referrerBonusMessage = ` +${referralBonus} PI pour ${referrer.name || referrer.username}`;
    } else {
      // Referrer bonus will be granted when user completes KYC and first deposit
      referrerBonusMessage = `. Le bonus du parrain sera verse apres votre KYC et premier depot`;
    }

    return NextResponse.json({
      success: true,
      message: `Parrainage applique ! Bonus: +${referralWelcomeBonus} PI pour vous${referrerBonusMessage}`,
      referrerName: referrer.name || referrer.username,
      referrerBonusPending: !eligibility.eligible,
    });
  } catch (error: any) {
    console.error("REFERRAL_POST_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
