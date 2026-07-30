export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { nanoid } from "nanoid";
import { parseAmount } from "@/lib/amount-guard";

// Durees d'expiration autorisees (au choix de l'utilisateur).
const DURATION_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const ALLOWED_CURRENCIES = [
  "PI",
  "SDA",
  "XAF",
  "XOF",
  "USD",
  "EUR",
  "CDF",
  "NGN",
  "AED",
  "CNY",
  "VND",
  "MGA",
];

async function getUserId() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  return payload?.id ?? null;
}

// ─── Creer une demande de paiement ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const requesterId = await getUserId();
    if (!requesterId) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const body = await req.json();
    const currency = (body.currency || "PI").toUpperCase().trim();
    const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
    const duration = String(body.duration || "7d");

    if (!ALLOWED_CURRENCIES.includes(currency)) {
      return NextResponse.json({ error: "Devise non supportee." }, { status: 400 });
    }
    if (!DURATION_MS[duration]) {
      return NextResponse.json({ error: "Duree invalide." }, { status: 400 });
    }

    const parsed = parseAmount(body.amount);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const amount = parsed.value;

    const expiresAt = new Date(Date.now() + DURATION_MS[duration]);

    const request = await prisma.paymentRequest.create({
      data: {
        code: nanoid(10),
        requesterId,
        amount,
        currency,
        note: note || null,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, request });
  } catch (err: any) {
    console.log("[v0] payment request create error:", err?.message);
    return NextResponse.json(
      { error: "Impossible de creer la demande de paiement." },
      { status: 500 }
    );
  }
}

// ─── Lister mes demandes de paiement (emises) ───────────────────────────────
export async function GET() {
  try {
    const requesterId = await getUserId();
    if (!requesterId) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    // Marque comme EXPIRED les demandes PENDING dont la date est depassee.
    await prisma.paymentRequest.updateMany({
      where: {
        requesterId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const requests = await prisma.paymentRequest.findMany({
      where: { requesterId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        payer: { select: { username: true, name: true } },
      },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.log("[v0] payment request list error:", err?.message);
    return NextResponse.json(
      { error: "Impossible de charger vos demandes." },
      { status: 500 }
    );
  }
}
