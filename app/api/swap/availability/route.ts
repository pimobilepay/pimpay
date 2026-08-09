export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSwapAvailability } from "@/lib/swapAvailability";
import { getCorsHeaders, corsPreflightResponse } from "@/lib/cors";

/**
 * Disponibilite des actifs au swap (lecture publique).
 * Pilote depuis Admin > Reglages > Apercu : quand un actif est suspendu,
 * le client affiche "Bientot disponible" et le swap vers cet actif est bloque.
 */
export async function GET(req: Request) {
  const cors = {
    ...getCorsHeaders(req),
    "Cache-Control": "no-store, max-age=0",
  };

  const availability = await getSwapAvailability();
  return NextResponse.json({ success: true, ...availability }, { headers: cors });
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
