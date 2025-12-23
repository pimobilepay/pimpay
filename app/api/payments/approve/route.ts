export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
// Change l'importation ici : ajoute des accolades { }
import { prisma } from "@/lib/prisma"; 

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!PI_API_KEY) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
      },
    });

    if (!response.ok) throw new Error("Approbation échouée auprès de Pi");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("APPROVE ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

