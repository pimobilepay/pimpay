// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth"; // Utilise verifyAuth ici !

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req);

    if (!payload) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletAddress: true,
        wallets: {
          where: { type: "PI" },
          select: { balance: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        balance: user.wallets[0]?.balance ?? 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
