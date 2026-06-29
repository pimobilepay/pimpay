export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { getPiPrice } from "@/lib/fees";
import { toUsd, DEFAULT_CRYPTO_PRICES, FIAT_RATES } from "@/lib/exchange";

function levelFromScore(score: number): string {
  if (score >= 85) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

async function getPriceMap(): Promise<Record<string, number>> {
  const piPrice = await getPiPrice();
  return { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES, PI: piPrice };
}

// GET — tableau de bord AML : stats, SAR, règles, profils de risque
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.AML_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const [rules, sars, byStatus, bySeverity, openCount, profiles] = await Promise.all([
    prisma.amlRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.suspiciousActivity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.suspiciousActivity.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.suspiciousActivity.groupBy({ by: ["severity"], _count: { id: true } }),
    prisma.suspiciousActivity.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.riskProfile.findMany({ orderBy: { score: "desc" }, take: 50 }),
  ]);

  // Enrichir SAR + profils avec infos utilisateur
  const userIds = Array.from(
    new Set([
      ...sars.map((s) => s.userId).filter(Boolean),
      ...profiles.map((p) => p.userId),
    ])
  ) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true, email: true, avatar: true, kycStatus: true, country: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    stats: {
      open: openCount,
      total: sars.length,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s.status]: s._count.id }), {} as Record<string, number>),
      bySeverity: bySeverity.reduce((a, s) => ({ ...a, [s.severity]: s._count.id }), {} as Record<string, number>),
      activeRules: rules.filter((r) => r.enabled).length,
    },
    rules,
    sars: sars.map((s) => ({ ...s, user: s.userId ? userMap.get(s.userId) || null : null })),
    profiles: profiles.map((p) => ({ ...p, user: userMap.get(p.userId) || null })),
  });
}

// POST — actions AML
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.AML_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "createRule": {
        const rule = await prisma.amlRule.create({
          data: {
            name: String(body.name || "Nouvelle règle"),
            description: body.description || null,
            type: body.type || "AMOUNT",
            threshold: Number(body.threshold) || 0,
            windowHours: Number(body.windowHours) || 24,
            currency: body.currency || null,
            action: body.ruleAction || "FLAG",
            severity: body.severity || "MEDIUM",
            enabled: body.enabled !== false,
            createdBy: ctx.payload.id,
          },
        });
        await logAdminAction(req, ctx.payload, { action: "AML_CREATE_RULE", category: "aml", details: rule.name });
        return NextResponse.json({ success: true, rule });
      }
      case "toggleRule": {
        const rule = await prisma.amlRule.update({
          where: { id: body.ruleId },
          data: { enabled: !!body.enabled },
        });
        await logAdminAction(req, ctx.payload, { action: "AML_TOGGLE_RULE", category: "aml", details: `${rule.name} = ${rule.enabled}` });
        return NextResponse.json({ success: true, rule });
      }
      case "updateRule": {
        const rule = await prisma.amlRule.update({
          where: { id: body.ruleId },
          data: {
            name: body.name,
            threshold: Number(body.threshold),
            windowHours: Number(body.windowHours),
            severity: body.severity,
            action: body.ruleAction,
            currency: body.currency || null,
          },
        });
        await logAdminAction(req, ctx.payload, { action: "AML_UPDATE_RULE", category: "aml", details: rule.name });
        return NextResponse.json({ success: true, rule });
      }
      case "deleteRule": {
        await prisma.amlRule.delete({ where: { id: body.ruleId } });
        await logAdminAction(req, ctx.payload, { action: "AML_DELETE_RULE", category: "aml", details: body.ruleId });
        return NextResponse.json({ success: true });
      }
      case "createSar": {
        const sar = await prisma.suspiciousActivity.create({
          data: {
            userId: body.userId || null,
            transactionId: body.transactionId || null,
            title: String(body.title || "Signalement manuel"),
            type: body.type || "SUSPICIOUS",
            severity: body.severity || "MEDIUM",
            amount: body.amount != null ? Number(body.amount) : null,
            currency: body.currency || null,
            description: body.description || null,
            detectedBy: "MANUAL",
          },
        });
        await logAdminAction(req, ctx.payload, { action: "AML_CREATE_SAR", category: "aml", targetId: body.userId, details: sar.title });
        return NextResponse.json({ success: true, sar });
      }
      case "updateSar": {
        const sar = await prisma.suspiciousActivity.update({
          where: { id: body.sarId },
          data: {
            status: body.status,
            resolution: body.resolution || null,
            reviewedBy: ctx.payload.id,
            reviewedAt: new Date(),
          },
        });
        await logAdminAction(req, ctx.payload, { action: "AML_UPDATE_SAR", category: "aml", targetId: sar.userId, details: `${sar.title} → ${sar.status}` });
        return NextResponse.json({ success: true, sar });
      }
      case "scan": {
        const result = await runAmlScan(ctx.payload.id);
        await logAdminAction(req, ctx.payload, { action: "AML_SCAN", category: "aml", details: `${result.flagged} alerte(s), ${result.profilesUpdated} profil(s)` });
        return NextResponse.json({ success: true, ...result });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("AML_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}

// ---- Moteur de détection : évalue les règles actives sur les transactions récentes ----
async function runAmlScan(adminId: string) {
  const priceMap = await getPriceMap();
  const rules = await prisma.amlRule.findMany({ where: { enabled: true } });
  let flagged = 0;
  const riskByUser = new Map<string, { score: number; reasons: string[] }>();

  const addRisk = (userId: string, pts: number, reason: string) => {
    const cur = riskByUser.get(userId) || { score: 0, reasons: [] };
    cur.score += pts;
    cur.reasons.push(reason);
    riskByUser.set(userId, cur);
  };

  for (const rule of rules) {
    const since = new Date(Date.now() - rule.windowHours * 3600 * 1000);
    const txs = await prisma.transaction.findMany({
      where: { createdAt: { gte: since }, status: { in: ["SUCCESS", "PENDING"] } },
      select: { id: true, amount: true, currency: true, fromUserId: true, type: true, createdAt: true },
    });

    if (rule.type === "AMOUNT") {
      for (const tx of txs) {
        if (!tx.fromUserId) continue;
        const usd = toUsd(tx.currency, tx.amount, priceMap);
        const value = rule.currency ? (tx.currency === rule.currency ? tx.amount : null) : usd;
        if (value != null && value >= rule.threshold) {
          await upsertSar(rule, tx.fromUserId, tx.id, tx.amount, tx.currency,
            `Montant élevé: ${tx.amount} ${tx.currency} (règle ${rule.name})`);
          addRisk(tx.fromUserId, rule.severity === "CRITICAL" ? 30 : 20, "Montant élevé");
          flagged++;
        }
      }
    } else if (rule.type === "VELOCITY") {
      const counts = new Map<string, number>();
      txs.forEach((tx) => tx.fromUserId && counts.set(tx.fromUserId, (counts.get(tx.fromUserId) || 0) + 1));
      for (const [userId, count] of counts) {
        if (count >= rule.threshold) {
          await upsertSar(rule, userId, null, null, null,
            `Vélocité: ${count} transactions en ${rule.windowHours}h (seuil ${rule.threshold})`);
          addRisk(userId, 20, "Vélocité élevée");
          flagged++;
        }
      }
    } else if (rule.type === "STRUCTURING") {
      // Multiples montants juste sous un seuil (fractionnement)
      const buckets = new Map<string, number>();
      for (const tx of txs) {
        if (!tx.fromUserId) continue;
        const usd = toUsd(tx.currency, tx.amount, priceMap);
        if (usd >= rule.threshold * 0.7 && usd < rule.threshold) {
          buckets.set(tx.fromUserId, (buckets.get(tx.fromUserId) || 0) + 1);
        }
      }
      for (const [userId, count] of buckets) {
        if (count >= 3) {
          await upsertSar(rule, userId, null, null, null,
            `Fractionnement potentiel: ${count} opérations sous le seuil ${rule.threshold}$`);
          addRisk(userId, 25, "Fractionnement");
          flagged++;
        }
      }
    }
  }

  // Facteurs statiques (KYC, ancienneté) sur les utilisateurs concernés
  const userIds = Array.from(riskByUser.keys());
  if (userIds.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, kycStatus: true, createdAt: true },
    });
    for (const u of users) {
      if (u.kycStatus !== "VERIFIED" && u.kycStatus !== "APPROVED") addRisk(u.id, 15, "KYC non vérifié");
      if (Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000) addRisk(u.id, 10, "Compte récent");
    }
  }

  let profilesUpdated = 0;
  for (const [userId, r] of riskByUser) {
    const score = Math.min(100, r.score);
    await prisma.riskProfile.upsert({
      where: { userId },
      create: { userId, score, level: levelFromScore(score), factors: r.reasons, flagsCount: r.reasons.length, lastEventAt: new Date() },
      update: { score, level: levelFromScore(score), factors: r.reasons, flagsCount: { increment: 0 }, lastEventAt: new Date() },
    });
    profilesUpdated++;
  }

  return { flagged, profilesUpdated };
}

// Évite les doublons : pas de SAR identique ouverte sur la même transaction/règle
async function upsertSar(
  rule: { id: string; name: string; type: string; severity: string },
  userId: string,
  transactionId: string | null,
  amount: number | null,
  currency: string | null,
  description: string
) {
  const existing = await prisma.suspiciousActivity.findFirst({
    where: { ruleId: rule.id, userId, transactionId: transactionId || undefined, status: { in: ["OPEN", "REVIEWING"] } },
    select: { id: true },
  });
  if (existing) return;
  await prisma.suspiciousActivity.create({
    data: {
      userId,
      transactionId,
      ruleId: rule.id,
      title: rule.name,
      type: rule.type,
      severity: rule.severity,
      amount,
      currency,
      description,
      detectedBy: "RULE",
    },
  });
}
