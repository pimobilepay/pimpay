import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: session.user.id },
          { toUserId: session.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { username: true, name: true, avatar: true } },
        toUser: { select: { username: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}
