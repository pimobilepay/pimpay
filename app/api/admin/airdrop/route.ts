export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";

const PROGRAM_ID = "GLOBAL_REFERRAL";

export const ROLES = [
  "USER",
  "AGENT",
  "MERCHANT",
  "BUSINESS_ADMIN",
  "BANK_ADMIN",
  "ADMIN",
] as const;
type Role = (typeof ROLES)[number];

const CHUNK = 40;

function ref(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

async function getProgram() {
  return prisma.referralProgram.upsert({
    where: { id: PROGRAM_ID },
    create: { id: PROGRAM_ID },
    update: {},
  });
}

/* ────────────────────────────────────────────────────────────────
   GET — audience par rôle, historique airdrop, bonus de parrainage
   ──────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.AIRDROP_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const [program, byRole, activeByRole, airdropAgg, lastAirdrops, pendingAgg, paidAgg, pendingByReferrer] =
    await Promise.all([
      getProgram(),
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
      prisma.user.groupBy({ by: ["role"], where: { status: "ACTIVE" }, _count: { id: true } }),
      prisma.transaction.aggregate({
        where: { type: "AIRDROP", status: "SUCCESS" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.auditLog.findMany({
        where: { action: { startsWith: "AIRDROP_" } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, action: true, adminName: true, details: true, createdAt: true, status: true },
      }),
      prisma.referralEarning.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.referralEarning.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.referralEarning.groupBy({
        by: ["referrerId", "currency"],
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

  const totalMap = new Map(byRole.map((r) => [r.role, r._count.id]));
  const activeMap = new Map(activeByRole.map((r) => [r.role, r._count.id]));

  const users = await prisma.user.findMany({
    where: { id: { in: pendingByReferrer.slice(0, 50).map((p) => p.referrerId) } },
    select: { id: true, username: true, name: true, email: true, avatar: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const minPayout = program.minPayout || 0;
  const rows = pendingByReferrer.map((p) => ({
    referrerId: p.referrerId,
    currency: p.currency,
    amount: p._sum.amount || 0,
    earningsCount: p._count.id,
    eligible: (p._sum.amount || 0) >= minPayout,
    user: userMap.get(p.referrerId) || null,
  }));

  const eligible = rows.filter((r) => r.eligible);

  return NextResponse.json({
    currency: program.currency,
    minPayout,
    programEnabled: program.enabled,
    roles: ROLES.map((role) => ({
      role,
      total: totalMap.get(role) || 0,
      active: activeMap.get(role) || 0,
    })),
    airdrop: {
      distributedAmount: airdropAgg._sum.amount || 0,
      distributedCount: airdropAgg._count.id,
      history: lastAirdrops,
    },
    referral: {
      pendingAmount: pendingAgg._sum.amount || 0,
      pendingCount: pendingAgg._count.id,
      paidAmount: paidAgg._sum.amount || 0,
      paidCount: paidAgg._count.id,
      referrersPending: rows.length,
      eligibleReferrers: eligible.length,
      eligibleAmount: eligible.reduce((s, r) => s + r.amount, 0),
      rows: rows.slice(0, 50),
    },
  });
}

/* ────────────────────────────────────────────────────────────────
   POST — distribution airdrop par rôle / paiement des bonus
   ──────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.AIRDROP_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    /* ── 1. Airdrop : montant distinct par rôle ─────────────── */
    if (action === "distributeAirdrop") {
      const currency = typeof body.currency === "string" && body.currency ? body.currency : "PI";
      const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
      const onlyActive = body.onlyActive !== false;
      const raw = (body.amounts || {}) as Record<string, unknown>;

      const plan = ROLES.map((role) => ({ role, amount: Number(raw[role]) || 0 })).filter(
        (p) => p.amount > 0
      );
      if (plan.length === 0) {
        return NextResponse.json({ error: "Aucun montant valide saisi" }, { status: 400 });
      }
      if (plan.some((p) => p.amount > 1_000_000)) {
        return NextResponse.json({ error: "Montant par rôle trop élevé (max 1 000 000)" }, { status: 400 });
      }

      const batchId = ref("AIRDROP");
      const summary: { role: Role; amount: number; recipients: number; total: number }[] = [];

      for (const { role, amount } of plan) {
        const recipients = await prisma.user.findMany({
          where: { role, ...(onlyActive ? { status: "ACTIVE" } : {}) },
          select: { id: true },
        });

        for (let i = 0; i < recipients.length; i += CHUNK) {
          const slice = recipients.slice(i, i + CHUNK);
          await prisma.$transaction(
            slice.flatMap((u) => [
              prisma.wallet.upsert({
                where: { userId_currency: { userId: u.id, currency } },
                create: { userId: u.id, currency, balance: amount, type: currency === "PI" ? "PI" : "CRYPTO" },
                update: { balance: { increment: amount } },
              }),
              prisma.transaction.create({
                data: {
                  reference: ref("AD"),
                  type: "AIRDROP",
                  status: "SUCCESS",
                  amount,
                  netAmount: amount,
                  currency,
                  toUserId: u.id,
                  description: note || `Airdrop ${role}`,
                  metadata: { kind: "ROLE_AIRDROP", batchId, role, adminId: ctx.payload.id },
                },
              }),
              prisma.notification.create({
                data: {
                  userId: u.id,
                  title: "Airdrop reçu",
                  message: `Vous avez reçu ${amount} ${currency}${note ? ` — ${note}` : ""}.`,
                  type: "AIRDROP",
                  metadata: { amount, currency, batchId, role },
                },
              }),
            ])
          );
        }

        summary.push({ role, amount, recipients: recipients.length, total: recipients.length * amount });
      }

      const grandTotal = summary.reduce((s, r) => s + r.total, 0);
      await logAdminAction(req, ctx.payload, {
        action: "AIRDROP_DISTRIBUTE_BY_ROLE",
        category: "airdrop",
        targetType: "ROLE_BATCH",
        targetId: batchId,
        details: `${grandTotal} ${currency} · ${summary
          .map((s) => `${s.role}:${s.amount}×${s.recipients}`)
          .join(", ")}${note ? ` · ${note}` : ""}`,
      });

      return NextResponse.json({ success: true, batchId, currency, grandTotal, summary });
    }

    /* ── 2. Bonus de parrainage : calcul (simulation) ────────── */
    if (action === "computeReferralBonuses") {
      const program = await getProgram();
      const groups = await prisma.referralEarning.groupBy({
        by: ["referrerId", "currency"],
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const eligible = groups.filter((g) => (g._sum.amount || 0) >= (program.minPayout || 0));
      return NextResponse.json({
        success: true,
        computedAt: new Date().toISOString(),
        minPayout: program.minPayout,
        totalPending: groups.reduce((s, g) => s + (g._sum.amount || 0), 0),
        totalEligible: eligible.reduce((s, g) => s + (g._sum.amount || 0), 0),
        referrersPending: groups.length,
        referrersEligible: eligible.length,
        earningsEligible: eligible.reduce((s, g) => s + g._count.id, 0),
        byCurrency: Object.entries(
          eligible.reduce<Record<string, number>>((acc, g) => {
            acc[g.currency] = (acc[g.currency] || 0) + (g._sum.amount || 0);
            return acc;
          }, {})
        ).map(([currency, amount]) => ({ currency, amount })),
      });
    }

    /* ── 3. Bonus de parrainage : paiement global ───────────── */
    if (action === "payReferralBonuses") {
      const program = await getProgram();
      const minPayout = program.minPayout || 0;

      const groups = await prisma.referralEarning.groupBy({
        by: ["referrerId", "currency"],
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const eligible = groups.filter((g) => (g._sum.amount || 0) >= minPayout && (g._sum.amount || 0) > 0);

      if (eligible.length === 0) {
        return NextResponse.json(
          { error: `Aucun parrain n'atteint le seuil de paiement (${minPayout})` },
          { status: 400 }
        );
      }

      const batchId = ref("REFPAY");
      let paidReferrers = 0;
      let paidEarnings = 0;
      let paidAmount = 0;

      for (const g of eligible) {
        const amount = g._sum.amount || 0;
        const { referrerId, currency } = g;

        const earnings = await prisma.referralEarning.findMany({
          where: { referrerId, currency, status: "PENDING" },
          select: { id: true },
        });
        const ids = earnings.map((e) => e.id);
        if (ids.length === 0) continue;

        await prisma.$transaction([
          prisma.wallet.upsert({
            where: { userId_currency: { userId: referrerId, currency } },
            create: { userId: referrerId, currency, balance: amount, type: currency === "PI" ? "PI" : "CRYPTO" },
            update: { balance: { increment: amount } },
          }),
          prisma.referralEarning.updateMany({
            where: { id: { in: ids }, status: "PENDING" },
            data: { status: "PAID", paidAt: new Date() },
          }),
          prisma.transaction.create({
            data: {
              reference: ref("RB"),
              type: "AIRDROP",
              status: "SUCCESS",
              amount,
              netAmount: amount,
              currency,
              toUserId: referrerId,
              description: "Bonus de parrainage",
              metadata: { kind: "REFERRAL_BONUS", batchId, earnings: ids.length, adminId: ctx.payload.id },
            },
          }),
          prisma.notification.create({
            data: {
              userId: referrerId,
              title: "Bonus de parrainage crédité",
              message: `Vos ${ids.length} gain(s) de parrainage ont été payés : ${amount} ${currency}.`,
              type: "REFERRAL_BONUS",
              metadata: { amount, currency, batchId, earnings: ids.length },
            },
          }),
        ]);

        paidReferrers += 1;
        paidEarnings += ids.length;
        paidAmount += amount;
      }

      await logAdminAction(req, ctx.payload, {
        action: "AIRDROP_PAY_REFERRAL_BONUSES",
        category: "referral",
        targetType: "REFERRAL_BATCH",
        targetId: batchId,
        details: `${paidAmount} payés · ${paidReferrers} parrain(s) · ${paidEarnings} gain(s)`,
      });

      return NextResponse.json({ success: true, batchId, paidReferrers, paidEarnings, paidAmount });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    console.error("AIRDROP_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
