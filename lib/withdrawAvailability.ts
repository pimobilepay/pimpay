/**
 * DISPONIBILITE DU RETRAIT MOBILE MONEY
 * --------------------------------------
 * Source unique de verite : SystemConfig.withdrawMobileMoneyEnabled,
 * pilote depuis Admin > Reglages > Apercu.
 *
 * Quand le retrait Mobile Money est suspendu, les routes de payout
 * (PawaPay / GeniusPay) refusent la demande cote serveur AVANT tout debit,
 * et le client affiche "Bientot disponible" au lieu de laisser l'utilisateur
 * tomber sur un echec de traitement generique.
 */

import { prisma } from "@/lib/prisma";

/** Code d'erreur renvoye par les routes de retrait quand le canal est suspendu. */
export const WITHDRAW_MOBILE_MONEY_DISABLED_CODE = "WITHDRAW_MOBILE_MONEY_DISABLED";

/** Message affiche a l'utilisateur (toast + ecran "Bientot disponible"). */
export const WITHDRAW_MOBILE_MONEY_DISABLED_MESSAGE =
  "Le retrait vers Mobile Money est momentanément indisponible. Bientôt disponible.";

/** Par defaut ouvert : aucune regression si la BDD est injoignable. */
export async function isMobileMoneyWithdrawEnabled(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return true;
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { withdrawMobileMoneyEnabled: true },
    });
    if (!config) return true;
    return config.withdrawMobileMoneyEnabled !== false;
  } catch {
    return true;
  }
}

/**
 * Reponse JSON standard a renvoyer (avec un statut 503) quand une route de
 * retrait Mobile Money doit se bloquer parce que le canal est suspendu.
 */
export function mobileMoneyWithdrawDisabledPayload() {
  return {
    error: WITHDRAW_MOBILE_MONEY_DISABLED_MESSAGE,
    code: WITHDRAW_MOBILE_MONEY_DISABLED_CODE,
    comingSoon: true,
  };
}
