export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import {
  AGENT_FLOAT_PURPOSE,
  DEFAULT_FLOAT_CURRENCY,
  floatReference,
  isFloatCurrency,
  parseFloatAmount,
  type FloatMovement,
} from "@/lib/agent-float";

/** Mappe une Transaction de float vers la forme consommee par le Hub. */
function toMovement(tx: any): FloatMovement {
  const meta = (tx.metadata || {}) as Record<string, any>;
  return {
    id: tx.id,
    reference: tx.reference,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status === "PENDING" ? "PENDING" : (tx.status as FloatMovement["status"]),
    note: tx.note ?? meta.note ?? null,
    description: tx.description ?? null,
    createdAt: tx.createdAt.toISOString(),
    source: meta.source || "AGENT_REQUEST",
    decidedByName: meta.decidedByName ?? null,
    decidedAt: meta.decidedAt ?? null,
    rejectReason: meta.rejectReason ?? null,
  };
}

async function requireAgent(req: NextRequest) {
  const authUser = (await verifyAuth(req)) as any;
  if (!authUser?.id) {
    return { error: NextResponse.json({ error: "Authentification requise" }, { status: 401 }) };
  }
  if (authUser.role !== "AGENT" && authUser.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Acces reserve aux agents" }, { status: 403 }) };
  }
  return { authUser };
}

/**
 * GET /api/agent/float
 * Historique des provisionnements et demandes de recharge de l'agent connecte.
 */
export async function GET(req: NextRequest) {
  try {
    const { authUser, error } = await requireAgent(req);
    if (error) return error;

    const [movements, wallets] = await Promise.all([
      prisma.transaction.findMany({
        where: { toUserId: authUser.id, purpose: AGENT_FLOAT_PURPOSE },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.wallet.findMany({
        where: { userId: authUser.id },
        select: { currency: true, balance: true },
      }),
    ]);

    const requests = movements.map(toMovement);

    return NextResponse.json({
      success: true,
      wallets,
      requests,
      pendingTotal: requests
        .filter((r) => r.status === "PENDING")
        .reduce((sum, r) => sum + r.amount, 0),
    });
  } catch (err: any) {
    console.error("[AGENT_FLOAT_GET]", err.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * POST /api/agent/float
 * Cree une demande de recharge de float adressee a l'administration.
 * Body: { amount, currency?, note? }
 */
export async function POST(req: NextRequest) {
  try {
    const { authUser, error } = await requireAgent(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { amount, err } = (() => {
      const parsed = parseFloatAmount(body.amount);
      return { amount: parsed.amount, err: parsed.error };
    })();
    if (err || amount === null) {
      return NextResponse.json({ error: err || "Montant invalide" }, { status: 400 });
    }

    const currency = isFloatCurrency(body.currency) ? body.currency : DEFAULT_FLOAT_CURRENCY;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    // Une seule demande en attente par devise, pour eviter les doublons.
    const existing = await prisma.transaction.findFirst({
      where: {
        toUserId: authUser.id,
        purpose: AGENT_FLOAT_PURPOSE,
        status: "PENDING",
        currency,
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `Une demande de recharge ${currency} est deja en attente (${existing.reference})`,
        },
        { status: 409 }
      );
    }

    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, username: true, agentId: true },
    });

    const request = await prisma.transaction.create({
      data: {
        reference: floatReference("FLTREQ"),
        amount,
        currency,
        type: "DEPOSIT",
        status: "PENDING",
        purpose: AGENT_FLOAT_PURPOSE,
        toUserId: authUser.id,
        description: `Demande de recharge float - ${amount.toLocaleString("fr-FR")} ${currency}`,
        note: note || null,
        metadata: {
          kind: AGENT_FLOAT_PURPOSE,
          source: "AGENT_REQUEST",
          note: note || null,
          agentId: agent?.agentId || null,
          agentName: agent?.name || agent?.username || null,
        },
      },
    });

    // Notification aux administrateurs (in-app).
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
      take: 25,
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: "Demande de recharge float",
          message: `${agent?.name || agent?.username || "Un agent"} demande ${amount.toLocaleString(
            "fr-FR"
          )} ${currency} de float.`,
          type: "AGENT_FLOAT_REQUEST",
          metadata: {
            requestId: request.id,
            reference: request.reference,
            amount,
            currency,
            agentUserId: authUser.id,
          },
        })),
      });
    }

    return NextResponse.json({ success: true, request: toMovement(request) });
  } catch (err: any) {
    console.error("[AGENT_FLOAT_POST]", err.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/float?id=...
 * L'agent annule sa demande en attente.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { authUser, error } = await requireAgent(req);
    if (error) return error;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

    const request = await prisma.transaction.findFirst({
      where: { id, toUserId: authUser.id, purpose: AGENT_FLOAT_PURPOSE, status: "PENDING" },
    });
    if (!request) {
      return NextResponse.json({ error: "Demande introuvable ou deja traitee" }, { status: 404 });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: "CANCELLED",
        metadata: {
          ...((request.metadata as Record<string, any>) || {}),
          decidedAt: new Date().toISOString(),
          decidedByName: "Agent",
        },
      },
    });

    return NextResponse.json({ success: true, request: toMovement(updated) });
  } catch (err: any) {
    console.error("[AGENT_FLOAT_DELETE]", err.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
