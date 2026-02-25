import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, amount, currency, email } = body;

    // 1. Validation rigoureuse
    if (!userId || !amount || amount <= 0 || !currency) {
      return NextResponse.json({ success: false, message: "Données invalides" }, { status: 400 });
    }

    // 2. Récupérer la config système pour appliquer les frais de carte (souvent plus élevés)
    const config = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    const cardFeeRate = 0.035; // Exemple : 3.5% pour les transactions par carte
    const fee = amount * cardFeeRate;
    const netAmount = amount - fee;

    // 3. Vérifier le Wallet de destination
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } }
    });

    if (!wallet) {
      return NextResponse.json({ success: false, message: "Portefeuille non configuré pour cette devise" }, { status: 404 });
    }

    // 4. Générer une référence de transaction unique PimPay
    const reference = `CARD-DEP-${uuidv4().split("-")[0].toUpperCase()}`;

    // 5. Créer la transaction en attente (PENDING)
    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: parseFloat(amount),
        fee: fee,
        netAmount: netAmount,
        currency,
        type: "DEPOSIT",
        status: "PENDING",
        description: "Dépôt par Carte Bancaire",
        toUserId: userId,
        toWalletId: wallet.id,
        metadata: {
          paymentMethod: "CARD",
          initiatedAt: new Date().toISOString()
        }
      }
    });

    // 6. APPEL AU PROCESSEUR (Simulation Stripe/Flutterwave)
    // Ici, vous appelleriez l'API du partenaire pour obtenir un 'checkout_url' ou un 'payment_intent'
    /*
    const paymentGateway = await fetch('https://api.provider.com/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        customer_email: email,
        tx_ref: reference,
        redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-callback`
      })
    });
    const gatewayData = await paymentGateway.json();
    */

    // 7. Log de sécurité pour l'audit bancaire
    await prisma.securityLog.create({
      data: {
        userId,
        action: "CARD_DEPOSIT_INITIATED",
        details: `Ref: ${reference} | Amount: ${amount} ${currency}`,
        ip: req.headers.get("x-forwarded-for") || "unknown"
      }
    });

    return NextResponse.json({
      success: true,
      reference: transaction.reference,
      checkoutUrl: "https://checkout.provider.com/pay/xyz", // URL de redirection simulée
      message: "Session de paiement créée"
    });

  } catch (error) {
    console.error("CARD_DEPOSIT_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur technique lors de l'initialisation" }, { status: 500 });
  }
}
