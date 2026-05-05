export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { watchDeposit } from "@/lib/pi-watcher";
import crypto from "crypto";

// [FIX V6] — Vérification HMAC-SHA256 de la signature du webhook
function verifyHmacSignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");
  // Comparaison à temps constant pour éviter les timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader.replace("sha256=", ""), "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // [FIX V6] — Lire le body brut pour la vérification HMAC avant de parser
  const rawBody = await request.text();
  const signature = request.headers.get("x-pi-signature");

  if (!verifyHmacSignature(rawBody, signature)) {
    console.warn("[WALLET_WEBHOOK] Signature invalide ou manquante");
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let paymentId: string;
  try {
    const parsed = JSON.parse(rawBody);
    paymentId = parsed.paymentId;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

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
