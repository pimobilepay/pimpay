import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // On extrait toutes les possibilités d'identification
    const { transactionId, id, paymentId, reference } = body;
    const identifier = transactionId || id || paymentId || reference;

    if (!identifier) {
      return NextResponse.json(
        { error: "Identification manquant (id ou transactionId requis)" },
        { status: 400 }
      );
    }

    // On cherche la transaction par ID ou par Référence/PaymentID
    const transaction = await prisma.transaction.update({
      where: {
        // On utilise 'id' si c'est un format UUID, sinon on cherche par 'reference'
        id: identifier, 
      },
      data: {
        status: "COMPLETED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: transaction });

  } catch (error: any) {
    console.error("Erreur de confirmation:", error);
    
    // Si l'ID n'est pas trouvé dans la colonne 'id', on tente par la colonne 'reference'
    if (error.code === 'P2025') {
       try {
         const body = await request.json();
         const identifier = body.transactionId || body.id || body.paymentId || body.reference;
         
         const txByRef = await prisma.transaction.update({
           where: { reference: identifier },
           data: { status: "COMPLETED" }
         });
         return NextResponse.json({ success: true, data: txByRef });
       } catch (innerError) {
         return NextResponse.json({ error: "Transaction introuvable avec cet ID ou Référence" }, { status: 404 });
       }
    }

    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
