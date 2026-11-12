import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Ce webhook de crédit direct est désactivé. Utilisez le flux Pi authentifié de paiement et de confirmation." },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
