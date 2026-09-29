import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayment } from "@/lib/geniuspay";

const PROVIDERS: Record<string, { name: string; currency: string }> = {
  CI: { name: "CIE", currency: "XOF" },
  BF: { name: "SONABEL", currency: "XOF" },
  TG: { name: "CEET", currency: "XOF" },
  BJ: { name: "SBEE", currency: "XOF" },
  CM: { name: "ENEO", currency: "XAF" },
  CD: { name: "SNEL", currency: "CDF" },
};

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const country = String(body.country || "").toUpperCase();
    const provider = PROVIDERS[country];
    const meterNumber = String(body.meterNumber || "").trim();
    const amount = Number(body.amount);
    const phone = String(body.phone || "").trim();
    const customerName = String(body.customerName || "").trim();
    if (!provider || String(body.provider || "") !== provider.name || !meterNumber || meterNumber.length > 40 || !Number.isInteger(amount) || amount < 200 || !phone) {
      return NextResponse.json({ error: "Données de paiement électricité invalides" }, { status: 400 });
    }

    const result = await createPayment({
      amount,
      currency: provider.currency,
      description: `Électricité ${provider.name} — compteur ${meterNumber}`,
      customer: { name: customerName || undefined, phone, country },
      metadata: { product: "electricity", provider: provider.name, country, meterNumber, userId: user.id },
    });
    const data = (result.data && "data" in result.data ? result.data.data : result.data) as { checkout_url?: string; payment_url?: string; reference?: string };
    if (!result.ok) return NextResponse.json({ error: "GeniusPay a refusé la demande", details: result.data }, { status: 502 });
    return NextResponse.json({ success: true, reference: data.reference, checkoutUrl: data.checkout_url || data.payment_url || null });
  } catch (error) {
    console.error("[v0] ELECTRICITY_PAYMENT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur du service GeniusPay" }, { status: 500 });
  }
}
