export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";

const DEFAULT_MAX_FAILED_ATTEMPTS = 5;

// GET : liste des tentatives échouées + comptes verrouillés + comptes à risque
export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Limite de tentatives configurée depuis la page Admin > Paramètres (Sécurité)
    const secCfg = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { maxLoginAttempts: true },
    });
    const maxAttempts =
      secCfg?.maxLoginAttempts && secCfg.maxLoginAttempts > 0
        ? secCfg.maxLoginAttempts
        : DEFAULT_MAX_FAILED_ATTEMPTS;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const search = searchParams.get("search") || "";
    const now = new Date();

    // 1. Journal des tentatives échouées / verrouillages (source AUTH)
    const where: any = {
      source: "AUTH",
      action: { in: ["FAILED_LOGIN", "ACCOUNT_LOCKED"] },
    };
    if (search) {
      where.message = { contains: search, mode: "insensitive" };
    }

    const [attempts, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    // 2. Comptes actuellement verrouillés
    const lockedUsers = await prisma.user.findMany({
      where: { lockedUntil: { gt: now } },
      orderBy: { lockedUntil: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginIp: true,
        lastLoginAt: true,
      },
    });

    // 3. Comptes "à risque" : tentatives échouées en cours mais non verrouillés
    const atRiskUsers = await prisma.user.findMany({
      where: {
        failedLoginAttempts: { gt: 0 },
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      orderBy: { failedLoginAttempts: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        failedLoginAttempts: true,
        lastLoginIp: true,
        lastLoginAt: true,
      },
    });

    // Statistiques rapides (24h)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [failed24h, locked24h] = await Promise.all([
      prisma.systemLog.count({
        where: { source: "AUTH", action: "FAILED_LOGIN", createdAt: { gte: last24h } },
      }),
      prisma.systemLog.count({
        where: { source: "AUTH", action: "ACCOUNT_LOCKED", createdAt: { gte: last24h } },
      }),
    ]);

    return NextResponse.json({
      attempts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      lockedUsers,
      atRiskUsers,
      maxAttempts: maxAttempts,
      stats: {
        failed24h,
        locked24h,
        lockedNow: lockedUsers.length,
        atRisk: atRiskUsers.length,
      },
    });
  } catch (error: any) {
    console.error("[LOGIN_ATTEMPTS_GET_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST : déverrouiller un compte (réinitialise le compteur + le verrou)
export async function POST(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await logSystemEvent({
      level: "INFO",
      source: "AUTH",
      action: "ACCOUNT_UNLOCKED",
      message: `Compte deverrouille manuellement par l'admin : ${user.email || user.username}`,
      details: { userId: user.id, adminId: payload.id, adminEmail: payload.email },
      userId: user.id,
    });

    // Journal d'audit admin (table auditLog affichée dans Admin > Journal d'audit)
    try {
      const admin = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, email: true },
      });
      await prisma.auditLog.create({
        data: {
          adminId: payload.id,
          adminName: admin?.name || admin?.email || payload.email || "Admin",
          action: "UNLOCK_ACCOUNT",
          targetId: user.id,
          targetEmail: user.email || null,
          details: `Déverrouillage du compte ${user.email || user.username} (verrouillé après trop de tentatives échouées)`,
        },
      });
    } catch (auditErr) {
      console.error("Audit Log Ignored (UNLOCK_ACCOUNT):", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LOGIN_ATTEMPTS_POST_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
