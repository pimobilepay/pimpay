export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WalletType } from "@prisma/client";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import {
  AGENT_FLOAT_PURPOSE,
  DEFAULT_FLOAT_CURRENCY,
  floatReference,
  isFloatCurrency,
  parseFloatAmount,
} from "@/lib/agent-float";

const AGENT_SELECT = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  username: true,
  phone: true,
  email: true,
  avatar: true,
  agentId: true,
  agentRole: true,
  agentType: true,
  status: true,
  kycStatus: true,
  country: true,
  city: true,
  wallets: { select: { currency: true, balance: true } },
} as const;

function walletTypeFor(currency: string): WalletType {
  return currency === "PI" ? WalletType.PI : WalletType.FIAT;
}

/**
 * GET /api/admin/agents/float
 * Liste des agents avec leur float, demandes en attente et historique.
 */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.TREASURY_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const [agents, pending, history, liquidityWallet] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "AGENT",
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { username: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                  { agentId: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: AGENT_SELECT,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.transaction.findMany({
        where: { purpose: AGENT_FLOAT_PURPOSE, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          toUser: {
            select: {
              id: true,
              name: true,
              username: true,
              phone: true,
              email: true,
              agentId: true,
              agentRole: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { purpose: AGENT_FLOAT_PURPOSE, status: { not: "PENDING" } },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          toUser: {
            select: {
              id: true,
              name: true,
              username: true,
              phone: true,
              email: true,
              agentId: true,
              agentRole: true,
            },
          },
        },
      }),
      prisma.systemWallet.findUnique({ where: { type: "LIQUIDITY" } }),
    ]);

    const map = (tx: (typeof pending)[number]) => {
      const meta = (tx.metadata || {}) as Record<string, any>;
      return {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        note: tx.note ?? meta.note ?? null,
        description: tx.description,
        createdAt: tx.createdAt.toISOString(),
        source: meta.source || "AGENT_REQUEST",
        decidedByName: meta.decidedByName ?? null,
        decidedAt: meta.decidedAt ?? null,
        rejectReason: meta.rejectReason ?? null,
        agent: tx.toUser,
      };
    };

    const totalFloat = agents.reduce(
      (sum, a) => sum + (a.wallets.find((w) => w.currency === DEFAULT_FLOAT_CURRENCY)?.balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      canManage: ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.TREASURY_MANAGE),
      agents,
      pending: pending.map(map),
      history: history.map(map),
      stats: {
        agentsCount: agents.length,
        totalFloat,
        pendingCount: pending.length,
        pendingAmount: pending.reduce((s, p) => s + p.amount, 0),
        liquidityXAF: liquidityWallet?.balanceXAF ?? null,
        liquidityLocked: liquidityWallet?.isLocked ?? false,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_AGENT_FLOAT_GET]", err.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * POST /api/admin/agents/float
 * Actions admin :
 *  - { action: "provision", agentUserId, amount, currency?, note? }  credit direct
 *  - { action: "approve", requestId, amount? }                       valide une demande
 *  - { action: "reject", requestId, reason? }                        refuse une demande
 *  - { action: "debit", agentUserId, amount, currency?, note? }      reprise de float
 */
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.TREASURY_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    /* ---------------- REJET D'UNE DEMANDE ---------------- */
    if (action === "reject") {
      const request = await prisma.transaction.findFirst({
        where: { id: String(body.requestId || ""), purpose: AGENT_FLOAT_PURPOSE, status: "PENDING" },
      });
      if (!request) {
        return NextResponse.json({ error: "Demande introuvable ou deja traitee" }, { status: 404 });
      }
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

      const updated = await prisma.transaction.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          metadata: {
            ...((request.metadata as Record<string, any>) || {}),
            decidedBy: ctx.payload.id,
            decidedByName: ctx.payload.name || ctx.payload.email || "Admin",
            decidedAt: new Date().toISOString(),
            rejectReason: reason || null,
          },
        },
      });

      if (request.toUserId) {
        await prisma.notification.create({
          data: {
            userId: request.toUserId,
            title: "Demande de float refusee",
            message: reason
              ? `Votre demande de ${request.amount.toLocaleString("fr-FR")} ${request.currency} a ete refusee : ${reason}`
              : `Votre demande de ${request.amount.toLocaleString("fr-FR")} ${request.currency} a ete refusee.`,
            type: "AGENT_FLOAT_REJECTED",
            metadata: { reference: request.reference, amount: request.amount, currency: request.currency },
          },
        });
      }

      await logAdminAction(req, ctx.payload, {
        action: "AGENT_FLOAT_REJECT",
        category: "finance",
        targetId: request.toUserId,
        targetType: "AGENT",
        details: `Refus recharge float ${request.amount} ${request.currency} (${request.reference})${reason ? ` - ${reason}` : ""}`,
      });

      return NextResponse.json({ success: true, request: { id: updated.id, status: updated.status } });
    }

    /* ---------------- CREDIT / DEBIT DU FLOAT ---------------- */
    const isApprove = action === "approve";
    const isDebit = action === "debit";
    if (!isApprove && action !== "provision" && !isDebit) {
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    let agentUserId: string | null = null;
    let amount: number | null = null;
    let currency: string = DEFAULT_FLOAT_CURRENCY;
    let note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    let requestRecord: { id: string; reference: string; metadata: any } | null = null;

    if (isApprove) {
      const request = await prisma.transaction.findFirst({
        where: { id: String(body.requestId || ""), purpose: AGENT_FLOAT_PURPOSE, status: "PENDING" },
      });
      if (!request || !request.toUserId) {
        return NextResponse.json({ error: "Demande introuvable ou deja traitee" }, { status: 404 });
      }
      agentUserId = request.toUserId;
      currency = request.currency;
      // L'admin peut ajuster le montant accorde.
      if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
        const parsed = parseFloatAmount(body.amount);
        if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
        amount = parsed.amount;
      } else {
        amount = request.amount;
      }
      note = note || (request.note ?? "");
      requestRecord = { id: request.id, reference: request.reference, metadata: request.metadata };
    } else {
      agentUserId = typeof body.agentUserId === "string" ? body.agentUserId : null;
      if (!agentUserId) return NextResponse.json({ error: "Agent manquant" }, { status: 400 });
      const parsed = parseFloatAmount(body.amount);
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      amount = parsed.amount;
      currency = isFloatCurrency(body.currency) ? body.currency : DEFAULT_FLOAT_CURRENCY;
    }

    if (!agentUserId || amount === null) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
    }

    const agent = await prisma.user.findUnique({
      where: { id: agentUserId },
      select: { id: true, name: true, username: true, email: true, role: true, status: true, agentId: true },
    });
    if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    if (agent.role !== "AGENT" && agent.role !== "ADMIN") {
      return NextResponse.json({ error: "Ce compte n'est pas un agent" }, { status: 400 });
    }
    if (agent.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Compte agent inactif : provisionnement bloque" },
        { status: 400 }
      );
    }

    const adminName = ctx.payload.name || ctx.payload.email || "Admin";
    const signedAmount = isDebit ? -amount : amount;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: agentUserId as string, currency } },
        update: {},
        create: {
          userId: agentUserId as string,
          currency,
          balance: 0,
          type: walletTypeFor(currency),
        },
      });

      if (isDebit && wallet.balance < amount) {
        throw new Error("Float agent insuffisant pour cette reprise");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: signedAmount } },
      });

      const metadata = {
        ...((requestRecord?.metadata as Record<string, any>) || {}),
        kind: AGENT_FLOAT_PURPOSE,
        source: isApprove ? "AGENT_REQUEST" : isDebit ? "ADMIN_DEBIT" : "ADMIN_DIRECT",
        note: note || null,
        decidedBy: ctx.payload.id,
        decidedByName: adminName,
        decidedAt: new Date().toISOString(),
        balanceAfter: updatedWallet.balance,
      };

      let movement;
      if (requestRecord) {
        movement = await tx.transaction.update({
          where: { id: requestRecord.id },
          data: {
            status: "SUCCESS",
            amount,
            netAmount: amount,
            toWalletId: updatedWallet.id,
            description: `Recharge float validee - ${amount.toLocaleString("fr-FR")} ${currency}`,
            note: note || null,
            metadata,
          },
        });
      } else {
        movement = await tx.transaction.create({
          data: {
            reference: floatReference("FLT"),
            amount,
            netAmount: amount,
            currency,
            type: "DEPOSIT",
            status: "SUCCESS",
            purpose: AGENT_FLOAT_PURPOSE,
            toUserId: isDebit ? null : agentUserId,
            fromUserId: isDebit ? agentUserId : null,
            toWalletId: isDebit ? null : updatedWallet.id,
            fromWalletId: isDebit ? updatedWallet.id : null,
            description: isDebit
              ? `Reprise de float - ${amount.toLocaleString("fr-FR")} ${currency}`
              : `Provisionnement float par ${adminName} - ${amount.toLocaleString("fr-FR")} ${currency}`,
            note: note || null,
            metadata,
          },
        });
      }

      // Mouvement de tresorerie : le float sort (ou revient) de la poche liquidite.
      if (currency === "XAF") {
        await tx.systemWallet
          .update({
            where: { type: "LIQUIDITY" },
            data: { balanceXAF: { decrement: signedAmount }, lastActivity: new Date() },
          })
          .catch(() => null);
      }

      // Double ecriture comptable.
      await tx.ledgerEntry
        .createMany({
          data: [
            {
              reference: movement.reference,
              transactionId: movement.id,
              account: "AGENT_FLOAT",
              description: `Float agent ${agent.name || agent.username || agent.id}`,
              debit: isDebit ? 0 : amount,
              credit: isDebit ? amount : 0,
              currency,
              type: "MANUAL_ADJUSTMENT",
              createdBy: ctx.payload.id,
            },
            {
              reference: movement.reference,
              transactionId: movement.id,
              account: "LIQUIDITY_WALLET",
              description: `Contrepartie provisionnement float`,
              debit: isDebit ? amount : 0,
              credit: isDebit ? 0 : amount,
              currency,
              type: "MANUAL_ADJUSTMENT",
              createdBy: ctx.payload.id,
            },
          ],
        })
        .catch(() => null);

      await tx.notification.create({
        data: {
          userId: agentUserId as string,
          title: isDebit ? "Float ajuste" : "Float credite",
          message: isDebit
            ? `${amount.toLocaleString("fr-FR")} ${currency} ont ete reprises sur votre float. Nouveau solde : ${updatedWallet.balance.toLocaleString("fr-FR")} ${currency}.`
            : `Votre float a ete credite de ${amount.toLocaleString("fr-FR")} ${currency}. Nouveau solde : ${updatedWallet.balance.toLocaleString("fr-FR")} ${currency}.`,
          type: isDebit ? "AGENT_FLOAT_DEBIT" : "AGENT_FLOAT_CREDIT",
          metadata: {
            reference: movement.reference,
            amount,
            currency,
            balanceAfter: updatedWallet.balance,
            by: adminName,
          },
        },
      });

      return { movement, balance: updatedWallet.balance };
    }, { maxWait: 10000, timeout: 30000 });

    await logAdminAction(req, ctx.payload, {
      action: isDebit ? "AGENT_FLOAT_DEBIT" : isApprove ? "AGENT_FLOAT_APPROVE" : "AGENT_FLOAT_PROVISION",
      category: "finance",
      targetId: agentUserId,
      targetType: "AGENT",
      targetEmail: agent.email,
      details: `${isDebit ? "Reprise" : "Provision"} float ${amount} ${currency} - solde ${result.balance} (${result.movement.reference})${note ? ` - ${note}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      reference: result.movement.reference,
      balance: result.balance,
      currency,
      amount,
    });
  } catch (err: any) {
    console.error("[ADMIN_AGENT_FLOAT_POST]", err.message);
    return NextResponse.json(
      { error: err.message || "Erreur lors du provisionnement" },
      { status: 400 }
    );
  }
}
