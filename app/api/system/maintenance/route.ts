export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMaintenanceState } from "@/lib/maintenance";

/**
 * GET /api/system/maintenance — état public de la maintenance.
 *
 * Volontairement NON authentifié : le proxy (edge) et la page /maintenance en
 * ont besoin avant toute vérification de session. Ne renvoie aucune donnée
 * sensible, uniquement l'annonce destinée aux utilisateurs.
 */
export async function GET() {
  const state = await getMaintenanceState();

  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
