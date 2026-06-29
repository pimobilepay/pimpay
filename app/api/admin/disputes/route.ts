export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";

// GET — litiges / chargebacks + statistiques
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.DISPUTES_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const type = searchParams.get("type") || undefined;

  const [disputes, byStatus, openAgg] = await Promise.all([
    prisma.dispute.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(type && type !== "ALL" ? { type } : {}),
      },
      orderBy: { openedAt: "desc" },
      take: 200,
    }),
    prisma.dispute.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.dispute.aggregate({
      where: { status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Enrichir avec infos utilisateur
  const userIds = Array.from(new Set(disputes.map((d) => d.userId).filter(Boolean))) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true, email: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    disputes: disputes.map((d) => ({ ...d, user: d.userId ? userMap.get(d.userId) || null : null })),
    stats: {
      open: openAgg._count.id,
      openAmount: openAgg._sum.amount || 0,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s.status]: s._count.id }), {} as Record<string, number>),
      total: disputes.length,
    },
  });
}

// POST — création & résolution de litiges
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.DISPUTES_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "create": {
        // Récupère la transaction liée si fournie pour pré-remplir montant/devise/utilisateur
        let userId = body.userId || null;
        let amount = Number(body.amount) || 0;
        let currency = body.currency || "XAF";
        if (body.transactionId) {
          const tx = await prisma.transaction.findUnique({ where: { id: body.transactionId } });
          if (tx) {
            userId = userId || tx.fromUserId;
            amount = amount || tx.amount;
            currency = tx.currency || currency;
          }
        }
        const dispute = await prisma.dispute.create({
          data: {
            userId,
            transactionId: body.transactionId || null,
            type: body.type || "DISPUTE",
            amount,
            currency,
            reason: body.reason || null,
            description: body.description || null,
            status: "OPEN",
          },
        });
        await logAdminAction(req, ctx.payload, {
          action: "DISPUTE_CREATE", category: "disputes", targetId: userId,
          details: `${dispute.type} ${dispute.amount} ${dispute.currency}`,
        });
        return NextResponse.json({ success: true, dispute });
      }
      case "assign": {
        const dispute = await prisma.dispute.update({
          where: { id: body.id },
          data: { assignedTo: ctx.payload.id, status: "UNDER_REVIEW" },
        });
        await logAdminAction(req, ctx.payload, {
          action: "DISPUTE_ASSIGN", category: "disputes", targetId: dispute.userId, details: dispute.reference,
        });
        return NextResponse.json({ success: true, dispute });
      }
      case "updateStatus": {
        const isClosed = ["RESOLVED", "REJECTED", "REFUNDED"].includes(body.status);
        const dispute = await prisma.dispute.update({
          where: { id: body.id },
          data: {
            status: body.status,
            resolution: body.resolution || null,
            ...(isClosed ? { resolvedAt: new Date() } : {}),
          },
        });

        // Remboursement : crédite le portefeuille de l'utilisateur dans la devise du litige
        if (body.status === "REFUNDED" && dispute.userId && dispute.amount > 0) {
          const wallet = await prisma.wallet.findFirst({
            where: { userId: dispute.userId, currency: dispute.currency },
          });
          if (wallet) {
            await prisma.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: dispute.amount } },
            });
          }
        }

        await logAdminAction(req, ctx.payload, {
          action: "DISPUTE_UPDATE", category: "disputes", targetId: dispute.userId,
          details: `${dispute.reference} → ${dispute.status}`,
        });
        return NextResponse.json({ success: true, dispute });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("DISPUTES_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
