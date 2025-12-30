import { NextResponse } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { paymentId } = await req.json();

    // 1. On enregistre la transaction comme "PENDING" dans Prisma
    // On récupère les détails du paiement via l'API Pi (nécessite ta clé API Pi)
    const piApiKey = process.env.PI_API_KEY;

    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${piApiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) throw new Error("Échec de l'approbation Pi");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
