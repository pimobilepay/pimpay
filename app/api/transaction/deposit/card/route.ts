import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";

/**
 * Le dépôt carte passe désormais par le checkout hébergé GeniusPay.
 * Cette route est conservée pour les anciennes versions du client, mais ne
 * collecte ni ne traite de données de carte et ne crédite jamais un wallet.
 */
export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Session expiree. Veuillez vous reconnecter." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      code: "GENIUSPAY_CHECKOUT_REQUIRED",
      message: "Le paiement par carte doit être effectué via le checkout sécurisé GeniusPay.",
    },
    { status: 410 }
  );
}
