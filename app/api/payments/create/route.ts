import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { amount, memo } = await req.json();

    // 1. Création de la transaction dans Prisma
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type: "PAYMENT", // Ou "TRANSFER"
        status: "PENDING",
        userId: payload.id,
        description: memo || "Transfert Pi Network",
      },
    });

    return NextResponse.json({ 
      orderId: transaction.id, 
      amount: transaction.amount 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
