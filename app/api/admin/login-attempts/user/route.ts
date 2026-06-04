export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

// GET : détails complets d'un utilisateur pour la modal de la page tentatives de connexion
export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        country: true,
        city: true,
        address: true,
        nationality: true,
        gender: true,
        birthDate: true,
        occupation: true,
        role: true,
        status: true,
        statusReason: true,
        kycStatus: true,
        autoApprove: true,
        twoFactorEnabled: true,
        dailyLimit: true,
        monthlyLimit: true,
        createdAt: true,
        idType: true,
        idNumber: true,
        idCountry: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycReason: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        pinUpdatedAt: true,
        referralCode: true,
        wallets: {
          select: { currency: true, balance: true, frozenBalance: true, type: true },
          orderBy: { balance: "desc" },
        },
        sessions: {
          where: { isActive: true },
          orderBy: { lastActiveAt: "desc" },
          take: 5,
          select: {
            id: true,
            ip: true,
            deviceName: true,
            browser: true,
            city: true,
            country: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            transactionsFrom: true,
            transactionsTo: true,
            referrals: true,
            notifications: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Tentatives de connexion récentes propres à cet utilisateur
    const recentAttempts = await prisma.systemLog.findMany({
      where: {
        userId,
        source: "AUTH",
        action: { in: ["FAILED_LOGIN", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED", "LOGIN"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, message: true, ip: true, createdAt: true },
    });

    const now = new Date();
    const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > now;

    return NextResponse.json({
      user: { ...user, isLocked },
      recentAttempts,
    });
  } catch (error: any) {
    console.error("[LOGIN_ATTEMPTS_USER_GET_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
