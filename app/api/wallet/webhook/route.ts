import { NextResponse } from "next/server";
import { watchDeposit } from "@/lib/pi-watcher";

export async function POST(request: Request) {
  const { paymentId } = await request.json();

  if (!paymentId) {
    return NextResponse.json({ error: "Payment ID manquant" }, { status: 400 });
  }

  // Lancer la vérification blockchain
  const result = await watchDeposit(paymentId);

  if (result.success) {
    return NextResponse.json({ message: `Solde crédité de ${result.amount} π` });
  } else {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }
}
