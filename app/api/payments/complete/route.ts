export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;

    // 1. Notifier Pi Network que nous avons enregistré la transaction
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
      },
      body: JSON.stringify({ txid }),
    });

    if (!response.ok) throw new Error("Complétion échouée");

    // 2. Mettre à jour la balance dans ta base de données
    // (Tu dois récupérer l'ID de l'utilisateur via le cookie ici)
    // await prisma.user.update({ ... });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
