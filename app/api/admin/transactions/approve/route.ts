import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification Admin
    const token = cookies().get("token")?.value;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token!, secret);
    
    const admin = await prisma.user.findUnique({ where: { id: payload.id as string } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    const { transactionId, action } = await req.json(); // action: "APPROVE" ou "REJECT"

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction non traitable" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "REJECT") {
        // Rembourser l'utilisateur
        const wallet = await tx.wallet.findFirst({ where: { userId: transaction.fromUserId! } });
        await tx.wallet.update({
          where: { id: wallet!.id },
          data: { balance: { increment: transaction.amount } }
        });

        return await tx.transaction.update({
          where: { id: transactionId },
          data: { status: "FAILED", note: transaction.note + " (REJETÉ & REMBOURSÉ)" }
        });
      }

      // Valider
      return await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" }
      });
    });

    return NextResponse.json({ success: true, newStatus: result.status });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
