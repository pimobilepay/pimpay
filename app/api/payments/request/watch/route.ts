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

/**
 * ─── Endpoint d'ecoute des demandes de paiement ────────────────────────────
 * Retourne une charge utile minimale (statut / paidAt / payeur / reference)
 * afin d'etre appele en boucle courte par la page mPay "Demande de paiement".
 * On peut cibler des codes precis via ?codes=a,b,c ; sans parametre, toutes
 * les demandes recentes du demandeur sont renvoyees.
 */
export async function GET(req: NextRequest) {
  try {
    const requesterId = await getUserId();
    if (!requesterId) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const codesParam = req.nextUrl.searchParams.get("codes");
    const codes = codesParam
      ? codesParam.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 50)
      : null;

    // Bascule en EXPIRED les demandes dont l'echeance vient de passer, pour
    // que l'ecoute reflete aussi les expirations en direct.
    await prisma.paymentRequest.updateMany({
      where: {
        requesterId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
        ...(codes ? { code: { in: codes } } : {}),
      },
      data: { status: "EXPIRED" },
    });

    const requests = await prisma.paymentRequest.findMany({
      where: {
        requesterId,
        ...(codes ? { code: { in: codes } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        code: true,
        status: true,
        paidAt: true,
        reference: true,
        amount: true,
        currency: true,
        payer: { select: { username: true, name: true } },
      },
    });

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      requests,
    });
  } catch (err: any) {
    console.log("[v0] payment request watch error:", err?.message);
    return NextResponse.json(
      { error: "Impossible de suivre vos demandes." },
      { status: 500 }
    );
  }
}
