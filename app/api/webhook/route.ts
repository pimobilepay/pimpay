export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

/**
 * ⚠️ ENDPOINT DÉSACTIVÉ — FAILLE CRITIQUE CORRIGÉE
 *
 * Cette route acceptait auparavant des callbacks au format CinetPay
 * (cpm_trans_id, cpm_result, cpm_amount, cpm_custom) SANS AUCUNE
 * vérification de secret ni de signature, et créditait directement
 * le wallet de l'utilisateur `cpm_custom` du montant `cpm_amount`.
 *
 * Impact : n'importe qui pouvait créditer n'importe quel compte du
 * montant de son choix via un simple POST non authentifié.
 *
 * Le vrai notify_url CinetPay utilisé par le frontend
 * (components/PaymentCinetPay.jsx) est /api/payments/webhook, qui
 * vérifie un secret partagé (x-webhook-secret) ET valide le montant
 * reçu contre la transaction stockée en base (±1% de tolérance).
 * Cette route-ci était du code orphelin, jamais appelée par
 * l'intégration réelle, mais restait publiquement joignable.
 *
 * Conservée en 404 (plutôt que supprimée) pour documenter la faille
 * et éviter qu'elle ne soit réintroduite par erreur.
 */
export async function POST() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
