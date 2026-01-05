import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Ou ton système de session
import { authOptions } from "@/lib/auth"; // Chemin vers ta config auth
import prisma from "@/lib/prisma"; // Pour enregistrer la transaction en DB

export async function POST(req: Request) {
  try {
    // 1. Vérification de la session (Sécurité)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, method, type, phoneNumber, operatorId, bankDetails, countryCode } = body;

    // 2. Log de la transaction en base de données (Statut PENDING)
    // On crée l'enregistrement avant l'appel API pour ne perdre aucune trace
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        currency,
        method, // MOBILE_MONEY | BANK_TRANSFER
        type,   // DEPOSIT | WITHDRAWAL
        status: "PENDING",
        providerReference: "", // Sera mis à jour après l'appel
        metadata: { phoneNumber, operatorId, bankDetails, countryCode }
      }
    });

    // 3. Appel vers l'agrégateur de paiement (Ex: Bizao, Flutterwave, CinetPay)
    // Note : On utilise des variables d'environnement pour les clés API
    const gatewayResponse = await fetch(process.env.PAYMENT_GATEWAY_ENDPOINT!, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PAYMENT_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: transaction.id, // On lie notre ID à leur système
        amount,
        currency,
        country: countryCode,
        payment_method: method === "MOBILE_MONEY" ? operatorId : "BANK",
        customer_phone: phoneNumber,
        bank_bic: bankDetails?.bic,
        bank_account: bankDetails?.accountNumber,
        iso_standard: "ISO20022"
      }),
    });

    const gatewayData = await gatewayResponse.json();

    if (gatewayResponse.ok) {
      // 4. Mise à jour avec la référence du fournisseur
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { providerReference: gatewayData.reference || gatewayData.id }
      });

      return NextResponse.json({ 
        success: true, 
        transactionId: transaction.id,
        message: "Transaction initialisée" 
      });
    } else {
      // En cas d'erreur du fournisseur
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" }
      });
      return NextResponse.json({ error: "Erreur fournisseur de paiement" }, { status: 400 });
    }

  } catch (error) {
    console.error("PAYMENT_ROUTE_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
