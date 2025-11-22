// app/api/transfer/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, amount, walletId } = body;

    if (!to || !amount || !walletId)
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );

    const cookie = cookies().get("pimpay_token")?.value;
    if (!cookie) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const decoded: any = verifyToken(cookie);
    if (!decoded) return NextResponse.json({ error: "Token invalide" }, { status: 403 });

    const sender = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!sender) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    const receiver = await prisma.user.findUnique({
      where: { phone: to },
    });

    if (!receiver)
      return NextResponse.json(
        { error: "Destinataire introuvable" },
        { status: 404 }
      );

    const senderWallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!senderWallet)
      return NextResponse.json(
        { error: "Portefeuille introuvable" },
        { status: 404 }
      );

    if (senderWallet.balance < Number(amount))
      return NextResponse.json(
        { error: "Solde insuffisant" },
        { status: 400 }
      );

    // Générer TXID
    const txid = "PMPAY-" + Math.random().toString(36).substring(2, 12).toUpperCase();

    // TRANSACTION
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: senderWallet.balance - Number(amount) },
      }),

      prisma.wallet.update({
        where: { userId: receiver.id, type: "PI" },
        data: { balance: { increment: Number(amount) } },
      }),

      prisma.transaction.create({
        data: {
          amount: Number(amount),
          type: "TRANSFER",
          status: "SUCCESS",
          reference: txid,
          fromUserId: sender.id,
          toUserId: receiver.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      txid,
      message: "Transfert effectué",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
