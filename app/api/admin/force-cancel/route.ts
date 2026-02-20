import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const paymentId = "lEU8r9rfLhKBOqLOz46CQWcarAgF"; // Ton ID bloqué

  try {
    // On tente d'envoyer une requête d'annulation à Pi Network
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: { 
        'Authorization': `Key ${process.env.PI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, message: "Paiement annulé avec succès. Tu peux retenter un dépôt." });
    } else {
      return NextResponse.json({ success: false, error: data }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
