import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayment, getAppBaseUrl } from "@/lib/geniuspay";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 200 || amount > 5_000_000) {
      return NextResponse.json({ error: "Le montant doit être un entier entre 200 et 5 000 000 XOF" }, { status: 400 });
    }
    const email = typeof body.email === "string" && body.email.includes("@") ? body.email.trim().slice(0, 160) : undefined;
    const baseUrl = getAppBaseUrl();
    const payment = await createPayment({
      amount,
      currency: "XOF",
      paymentMethod: "card",
      description: "Dépôt MPay par carte bancaire",
      customer: { name: user.name || user.username || undefined, email, country: "CI" },
      successUrl: `${baseUrl}/mpay?card_deposit=success`,
      errorUrl: `${baseUrl}/mpay?card_deposit=failed`,
      metadata: { userId: user.id, purpose: "MPAY_CARD_DEPOSIT" },
    });
    const data = (payment as any)?.data ?? payment;
    const checkoutUrl = data?.checkout_url || data?.payment_url;
    if (!checkoutUrl) return NextResponse.json({ error: "GeniusPay n'a pas fourni de lien de paiement" }, { status: 502 });
    return NextResponse.json({ success: true, checkoutUrl, reference: data.reference });
  } catch (error) {
    console.error("[v0] MPAY_CARD_DEPOSIT_ERROR", error);
    return NextResponse.json({ error: "Impossible de démarrer le paiement par carte" }, { status: 502 });
  }
}
