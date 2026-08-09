export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isMobileMoneyWithdrawEnabled } from "@/lib/withdrawAvailability";
import { getCorsHeaders, corsPreflightResponse } from "@/lib/cors";

/**
 * Disponibilite du retrait Mobile Money (lecture publique).
 * Pilote depuis Admin > Reglages > Apercu : quand le canal est suspendu,
 * le client affiche "Bientot disponible" au lieu de laisser l'utilisateur
 * lancer un retrait qui echouera.
 */
export async function GET(req: Request) {
  const cors = {
    ...getCorsHeaders(req),
    "Cache-Control": "no-store, max-age=0",
  };

  const mobileMoneyEnabled = await isMobileMoneyWithdrawEnabled();
  return NextResponse.json({ success: true, mobileMoneyEnabled }, { headers: cors });
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
