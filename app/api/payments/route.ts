export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST(req: Request) {
  try {
    // 1. Vérification de la session
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await req.json();
    const { amount, currency, method, type, phoneNumber, operatorId, bankDetails, countryCode } = body;

    // 2. Création de la transaction (Respect strict du schéma Pimpay)
    const transaction = await prisma.transaction.create({
      data: {
        // 'reference' est UNIQUE et OBLIGATOIRE dans ton schéma
        reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        fromUserId: userId, 
        amount: parseFloat(amount),
        currency: currency || "PI",
        type: type || "PAYMENT", 
        status: "PENDING",
        // 'blockchainTx' peut servir de référence externe
        blockchainTx: "", 
        // 'method' n'existe pas en colonne, on utilise 'metadata' (Json)
        metadata: {
          method, // MOBILE_MONEY | BANK_TRANSFER
          phoneNumber,
          operatorId,
          bankDetails,
          countryCode: countryCode || "CD"
        }
      }
    });

    // 3. Appel vers la passerelle de paiement
    // On vérifie que l'URL est configurée pour éviter un crash au fetch
    const gatewayUrl = process.env.PAYMENT_GATEWAY_ENDPOINT;
    if (!gatewayUrl) {
      console.warn("PAYMENT_GATEWAY_ENDPOINT non configuré");
      return NextResponse.json({ 
        success: true, 
        transactionId: transaction.id, 
        message: "Transaction enregistrée (Passerelle désactivée)" 
      });
    }

    const gatewayResponse = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PAYMENT_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: transaction.id,
        amount,
        currency,
        country: countryCode,
        payment_method: method === "MOBILE_MONEY" ? operatorId : "BANK",
        customer_phone: phoneNumber,
        bank_bic: bankDetails?.bic,
        bank_account: bankDetails?.accountNumber,
      }),
    });

    const gatewayData = await gatewayResponse.json();

    if (gatewayResponse.ok) {
      // 4. Mise à jour avec la référence du fournisseur
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { blockchainTx: gatewayData.reference || gatewayData.id || "" }
      });

      return NextResponse.json({
        success: true,
        transactionId: transaction.id,
        message: "Transaction initialisée"
      });
    } else {
      // Échec côté fournisseur
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" }
      });
      return NextResponse.json({
        error: "Le service de paiement a refusé la requête",
        details: gatewayData
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("PAYMENT_ROUTE_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du paiement" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Payment Service Operational" });
}
