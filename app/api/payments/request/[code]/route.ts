export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";

async function getUserId() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  return payload?.id ?? null;
}

// ─── Consulter une demande de paiement par code ─────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const viewerId = await getUserId();
    if (!viewerId) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const { code } = await params;

    const request = await prisma.paymentRequest.findUnique({
      where: { code },
      include: {
        requester: { select: { id: true, username: true, name: true } },
        payer: { select: { username: true, name: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }

    // Passe a EXPIRED si necessaire (lecture "juste-a-temps").
    let status = request.status;
    if (status === "PENDING" && request.expiresAt < new Date()) {
      await prisma.paymentRequest.update({
        where: { id: request.id },
        data: { status: "EXPIRED" },
      });
      status = "EXPIRED";
    }

    return NextResponse.json({
      request: {
        code: request.code,
        amount: request.amount,
        currency: request.currency,
        note: request.note,
        status,
        expiresAt: request.expiresAt,
        paidAt: request.paidAt,
        reference: request.reference,
        requester: request.requester,
        payer: request.payer,
        isOwner: request.requesterId === viewerId,
      },
    });
  } catch (err: any) {
    console.log("[v0] payment request get error:", err?.message);
    return NextResponse.json(
      { error: "Impossible de charger la demande." },
      { status: 500 }
    );
  }
}

// ─── Annuler une demande de paiement (par le demandeur uniquement) ──────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const { code } = await params;
    const request = await prisma.paymentRequest.findUnique({ where: { code } });

    if (!request) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }
    if (request.requesterId !== userId) {
      return NextResponse.json({ error: "Action non autorisee." }, { status: 403 });
    }
    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Seule une demande en attente peut etre annulee." },
        { status: 400 }
      );
    }

    await prisma.paymentRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("[v0] payment request cancel error:", err?.message);
    return NextResponse.json(
      { error: "Impossible d'annuler la demande." },
      { status: 500 }
    );
  }
}
