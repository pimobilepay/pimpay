/**
 * Le crédit de dépôts Pi n'est plus autorisé depuis un webhook Horizon non lié
 * à une transaction Pi approuvée et à son utilisateur. Les paiements sont
 * réglés exclusivement par les routes authentifiées de paiement Pi.
 */
export async function watchDeposit(_paymentId: string) {
  return {
    success: false as const,
    message: "Le watcher de dépôt direct est désactivé; utilisez le flux Pi authentifié.",
  };
}
