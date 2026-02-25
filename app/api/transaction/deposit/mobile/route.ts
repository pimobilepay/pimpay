import { NextResponse } from "next/server";
import { PrismaClient, TransactionStatus, TransactionType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, currency, phone, operator, countryCode, userId } = body;

    // 1. Validation de base
    if (!amount || amount <= 0 || !phone || !userId) {
      return NextResponse.json({ success: false, message: "Données manquantes" }, { status: 400 });
    }

    // 2. Récupérer la configuration globale pour les frais
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });
    const feeRate = config?.transactionFee || 0.02; // Défaut 2%
    const fee = amount * feeRate;

    // 3. Vérifier ou Créer le Wallet de destination pour cet utilisateur
    let wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          currency,
          balance: 0,
          type: "FIAT"
        }
      });
    }

    // 4. Création de la transaction en base de données (PENDING)
    const reference = `DEP-MM-${uuidv4().split('-')[0].toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: amount,
        fee: fee,
        netAmount: amount - fee,
        currency: currency,
        type: "DEPOSIT",
        status: "PENDING",
        description: `Dépôt Mobile Money via ${operator}`,
        operatorId: operator,
        countryCode: countryCode,
        accountNumber: phone, // Le numéro de téléphone du dépôt
        toUserId: userId,
        toWalletId: wallet.id,
        metadata: {
          initiationSource: "PimPay Mobile App",
          phone_used: phone
        }
      }
    });

    // 5. APPEL À L'AGRÉGATEUR (Ex: Flutterwave, Paystack, CinetPay ou autre)
    // Ici, tu simuleras l'appel API vers ton fournisseur de paiement local
    /*
    const paymentProviderResponse = await fetch("https://api.provider.com/v1/momo", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.PAYMENT_PROVIDER_KEY}` },
        body: JSON.stringify({
            amount,
            currency,
            phone,
            reference: transaction.reference,
            webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mobile-money`
        })
    });
    */

    // 6. Log de sécurité
    await prisma.securityLog.create({
      data: {
        userId,
        action: `DEPOSIT_INITIATED`,
        details: `Reference: ${reference}, Amount: ${amount} ${currency}`,
        device: req.headers.get("user-agent") || "unknown"
      }
    });

    return NextResponse.json({
      success: true,
      reference: transaction.reference,
      message: "Veuillez confirmer le retrait sur votre téléphone."
    });

  } catch (error) {
    console.error("DEPOSIT_API_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur PimPay" }, { status: 500 });
  }
}
