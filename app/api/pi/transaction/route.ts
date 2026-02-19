export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    const txid = searchParams.get("txid");

    if (!ref && !txid) {
      return NextResponse.json(
        { error: "Parametre ref ou txid requis" },
        { status: 400 }
      );
    }

    let transaction = null;

    // Recherche par txid blockchain (priorite - Pi Browser deposits)
    if (txid) {
      transaction = await prisma.transaction.findFirst({
        where: { blockchainTx: txid },
        include: { toUser: true, fromUser: true },
      });
    }

    // Fallback: recherche par reference
    if (!transaction && ref) {
      transaction = await prisma.transaction.findFirst({
        where: { reference: ref },
        include: { toUser: true, fromUser: true },
      });
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction introuvable" },
        { status: 404 }
      );
    }

    const user = transaction.toUser || transaction.fromUser;

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      fee: transaction.fee,
      netAmount: transaction.netAmount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      blockchainTx: transaction.blockchainTx,
      createdAt: transaction.createdAt,
      userName: user?.name || user?.username || "Utilisateur",
    });
  } catch (error: any) {
    console.error("[PI_TRANSACTION_GET]:", error.message);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
