import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tx = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        fromUser: { select: { username: true, name: true, image: true } },
        toUser: { select: { username: true, name: true, image: true } }
      }
    });

    if (!tx) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    return NextResponse.json(tx);
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
