export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

type ResponseData = NextResponse | Response;

/** Valeurs autorisees, alignees sur les enums Prisma UserRole / UserStatus. */
const ROLES = ["ADMIN", "USER", "MERCHANT", "AGENT", "BANK_ADMIN", "BUSINESS_ADMIN"] as const;
const STATUSES = ["ACTIVE", "BANNED", "PENDING", "FROZEN", "SUSPENDED", "MAINTENANCE"] as const;

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(req: NextRequest): Promise<ResponseData> {
  try {
    // 1. Authentification
    const payload = await adminAuth(req);
    if (!payload || payload instanceof NextResponse) {
      return payload || NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    // 2. Parametres de pagination / filtres
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number.parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        Number.parseInt(sp.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
      ),
    );

    const q = (sp.get("q") || "").trim();
    const roleParam = (sp.get("role") || "ALL").toUpperCase();
    const statusParam = (sp.get("status") || "ALL").toUpperCase();

    const where: Prisma.UserWhereInput = {};

    // Filtre par role (ignore si valeur inconnue ou "ALL")
    if ((ROLES as readonly string[]).includes(roleParam)) {
      where.role = roleParam as (typeof ROLES)[number];
    }

    // Filtre par statut
    if ((STATUSES as readonly string[]).includes(statusParam)) {
      where.status = statusParam as (typeof STATUSES)[number];
    }

    // Recherche : ID utilisateur (exact ou prefixe) + piUserId, nom, email,
    // username et telephone. La recherche par ID est la plus discriminante,
    // elle est donc placee en tete du OR.
    if (q) {
      where.OR = [
        { id: q },
        { id: { startsWith: q, mode: "insensitive" } },
        { piUserId: q },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    // 3. Une page de resultats + total filtre + stats globales.
    //    Les stats passent par count/groupBy cote base : on ne charge plus
    //    toute la table en memoire juste pour afficher des compteurs.
    const [total, users, byStatus, kycVerified, piUsers, grandTotal, byRole, piVolumeAgg] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatar: true,
          piUserId: true,
          phone: true,
          country: true,
          status: true,
          role: true,
          createdAt: true,
          kycStatus: true,
          autoApprove: true,
          lastLoginIp: true,
          lastLoginAt: true,
          maintenanceUntil: true,
          wallets: {
            select: { balance: true, currency: true },
          },
          stakings: {
            where: { isActive: true },
            select: { amount: true, currency: true, apy: true, rewardsEarned: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count({ where: { kycStatus: { in: ["VERIFIED", "APPROVED"] } } }),
      prisma.user.count({ where: { piUserId: { not: null } } }),
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      // Volume Pi total en circulation : agrege cote base, jamais en memoire
      prisma.wallet.aggregate({
        _sum: { balance: true },
        where: { currency: { equals: "PI", mode: "insensitive" } },
      }),
    ]);

    // 4. Transformation des données
    const formattedUsers = users.map((user) => {
      const piWallet = user.wallets?.find((w) => w.currency.toUpperCase() === "PI");
      const stakings = user.stakings || [];
      const stakedByCurrency: Record<string, number> = {};
      for (const s of stakings) {
        const cur = (s.currency || "PI").toUpperCase();
        stakedByCurrency[cur] = (stakedByCurrency[cur] || 0) + (s.amount || 0);
      }
      const totalStaked = stakings.reduce((acc, s) => acc + (s.amount || 0), 0);
      return {
        ...user,
        wallets: user.wallets || [],
        piBalance: piWallet ? piWallet.balance : 0,
        stakings,
        stakedByCurrency,
        totalStaked,
      };
    });

    const statusCount = (name: string) => byStatus.find((s) => s.status === name)?._count._all || 0;

    return NextResponse.json({
      users: formattedUsers,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      // Stats globales (non filtrees) pour les compteurs d'en-tete
      stats: {
        total: grandTotal,
        active: statusCount("ACTIVE"),
        banned: statusCount("BANNED") + statusCount("SUSPENDED"),
        kycVerified,
        piUsers,
        piVolume: piVolumeAgg._sum.balance || 0,
        byRole: byRole.reduce<Record<string, number>>((acc, r) => {
          acc[r.role] = r._count._all;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("API_ADMIN_USERS_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
