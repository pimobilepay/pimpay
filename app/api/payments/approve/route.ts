import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();

    // 1. On informe le serveur de Pi que nous approuvons le paiement
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.PI_API_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Échec de l'approbation Pi" }, { status: 400 });
    }

    return NextResponse.json({ message: "Paiement approuvé" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
