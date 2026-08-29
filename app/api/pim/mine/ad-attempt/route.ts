import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ATTEMPT_TTL_SECONDS = 120;

function secret() {
  const value = process.env.JWT_SECRET;
  return value ? new TextEncoder().encode(value) : null;
}

export function attemptExternalId(nonce: string) {
  return `PIM-AD-ATTEMPT-${createHash("sha256").update(nonce).digest("hex")}`;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const key = secret();
  if (!key) return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
  const nonce = randomBytes(24).toString("hex");
  await prisma.transaction.create({
    data: {
      reference: `PIM-AD-${nonce.slice(0, 16)}`,
      externalId: attemptExternalId(nonce),
      amount: 0,
      currency: "PIM",
      type: TransactionType.AIRDROP,
      status: TransactionStatus.PENDING,
      description: "Tentative de recompense publicitaire",
      toUserId: userId,
      metadata: { source: "rewarded_ad", state: "issued" },
    },
  });
  const token = await new SignJWT({ uid: userId, nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ATTEMPT_TTL_SECONDS}s`)
    .sign(key);
  return NextResponse.json({ attemptToken: token, expiresIn: ATTEMPT_TTL_SECONDS });
}

export async function verifyAttempt(token: string, userId: string) {
  const key = secret();
  if (!key || typeof token !== "string" || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.uid !== userId || typeof payload.nonce !== "string") return null;
    return { nonce: payload.nonce, externalId: attemptExternalId(payload.nonce) };
  } catch {
    return null;
  }
}
