import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { calculateExchangeWithFee, PI_CONSENSUS_RATE } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await req.json();
    const { amount, currency, phoneNumber, provider } = body;

    // Validation de base
    if (!amount || amount <= 0 || !phoneNumber) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 1. Calcul de la conversion via la lib exchange
    // Note: conversion.fee est en dollars (USD)
    const conversion = calculateExchangeWithFee(amount, currency);

    // 2. Vérification du solde réel en base de données
    const userWallet = await prisma.wallet.findFirst({ 
      where: { userId: userId } 
    });

    if (!userWallet || userWallet.balance < amount) {
      return NextResponse.json({ error: "Solde Pi insuffisant" }, { status: 400 });
    }

    // 3. Transaction Atomique (Tout ou rien)
    const request = await prisma.$transaction(async (tx) => {
      // A. Débiter le montant du wallet
      await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: amount } }
      });

      // B. Création de l'enregistrement de transaction
      // On ajoute crypto.randomUUID() car ton schéma demande un ID manuel
      return await tx.transaction.create({
        data: {
          id: crypto.randomUUID(), 
          amount: amount,
          type: "WITHDRAWAL",
          status: "PENDING",
          fromUserId: userId,
          note: `Retrait ${provider}: ${phoneNumber} (${conversion.total.toFixed(2)} ${currency})`,
          // On convertit les frais USD en Pi pour la base de données
          fee: conversion.fee / PI_CONSENSUS_RATE 
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Demande de retrait transmise avec succès",
      transactionId: request.id,
      fiatAmount: conversion.total,
      currency: currency
    });

  } catch (error: any) {
    console.error("WITHDRAW_ERROR:", error.message);
    
    // Message d'erreur spécifique si c'est un problème de contrainte Prisma
    if (error.message.includes("id")) {
      return NextResponse.json({ error: "Erreur de génération d'ID de transaction" }, { status: 500 });
    }

    return NextResponse.json({ error: "Erreur interne lors du traitement du retrait" }, { status: 500 });
  }
}
