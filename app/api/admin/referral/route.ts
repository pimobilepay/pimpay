export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";

const PROGRAM_ID = "GLOBAL_REFERRAL";

async function getProgram() {
  return prisma.referralProgram.upsert({
    where: { id: PROGRAM_ID },
    create: { id: PROGRAM_ID },
    update: {},
  });
}

// GET — config du programme, gains, classement des parrains
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.REFERRAL_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const [program, earnings, pendingAgg, paidAgg, topReferrers] = await Promise.all([
    getProgram(),
    prisma.referralEarning.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.referralEarning.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { id: true } }),
    prisma.referralEarning.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { id: true } }),
    prisma.referralEarning.groupBy({
      by: ["referrerId"],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
  ]);

  // Nombre total de filleuls par parrain (via User.referredById)
  const referralCounts = await prisma.user.groupBy({
    by: ["referredById"],
    where: { referredById: { not: null } },
    _count: { id: true },
  });

  // Enrichir gains + top parrains avec infos utilisateur
  const userIds = Array.from(
    new Set([
      ...earnings.map((e) => e.referrerId),
      ...topReferrers.map((t) => t.referrerId),
    ])
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true, email: true, avatar: true, referralCode: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const countMap = new Map(referralCounts.map((c) => [c.referredById, c._count.id]));

  return NextResponse.json({
    program,
    earnings: earnings.map((e) => ({ ...e, referrer: userMap.get(e.referrerId) || null })),
    topReferrers: topReferrers.map((t) => ({
      referrerId: t.referrerId,
      totalAmount: t._sum.amount || 0,
      earningsCount: t._count.id,
      referralsCount: countMap.get(t.referrerId) || 0,
      user: userMap.get(t.referrerId) || null,
    })),
    stats: {
      totalReferred: referralCounts.reduce((s, c) => s + c._count.id, 0),
      pendingAmount: pendingAgg._sum.amount || 0,
      pendingCount: pendingAgg._count.id,
      paidAmount: paidAgg._sum.amount || 0,
      paidCount: paidAgg._count.id,
    },
  });
}

// POST — config du programme + paiement des gains
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.REFERRAL_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "updateProgram": {
        const program = await prisma.referralProgram.upsert({
          where: { id: PROGRAM_ID },
          create: {
            id: PROGRAM_ID,
            enabled: body.enabled !== false,
            signupBonus: Number(body.signupBonus) || 0,
            commissionRate: Number(body.commissionRate) || 0,
            currency: body.currency || "PI",
            minPayout: Number(body.minPayout) || 0,
          },
          update: {
            enabled: body.enabled !== false,
            signupBonus: Number(body.signupBonus) || 0,
            commissionRate: Number(body.commissionRate) || 0,
            currency: body.currency || "PI",
            minPayout: Number(body.minPayout) || 0,
          },
        });
        await logAdminAction(req, ctx.payload, {
          action: "REFERRAL_UPDATE_PROGRAM", category: "referral",
          details: `bonus ${program.signupBonus} ${program.currency}, com ${(program.commissionRate * 100).toFixed(1)}%`,
        });
        return NextResponse.json({ success: true, program });
      }
      case "payEarning": {
        const earning = await prisma.referralEarning.findUnique({ where: { id: body.id } });
        if (!earning) return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
        if (earning.status === "PAID") return NextResponse.json({ error: "Déjà payé" }, { status: 400 });

        // Crédite le portefeuille du parrain
        const wallet = await prisma.wallet.findFirst({
          where: { userId: earning.referrerId, currency: earning.currency },
        });
        if (wallet) {
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: earning.amount } },
          });
        }
        const updated = await prisma.referralEarning.update({
          where: { id: body.id },
          data: { status: "PAID", paidAt: new Date() },
        });
        await logAdminAction(req, ctx.payload, {
          action: "REFERRAL_PAY_EARNING", category: "referral", targetId: earning.referrerId,
          details: `${earning.amount} ${earning.currency}`,
        });
        return NextResponse.json({ success: true, earning: updated });
      }
      case "cancelEarning": {
        const updated = await prisma.referralEarning.update({
          where: { id: body.id },
          data: { status: "CANCELLED" },
        });
        await logAdminAction(req, ctx.payload, {
          action: "REFERRAL_CANCEL_EARNING", category: "referral", targetId: updated.referrerId,
          details: `${updated.amount} ${updated.currency}`,
        });
        return NextResponse.json({ success: true, earning: updated });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("REFERRAL_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
