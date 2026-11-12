import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "La récupération globale a été désactivée pour empêcher la finalisation de paiements d'autres utilisateurs." },
    { status: 410, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
