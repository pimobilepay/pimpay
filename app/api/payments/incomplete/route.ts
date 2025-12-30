// Fonction à intégrer dans ton hook usePiAuth ou ta page de paiement
const onIncompletePaymentFound = async (payment: any) => {
  console.log("Paiement incomplet détecté :", payment);
  
  // 1. Envoyer l'ID au serveur pour vérification
  try {
    const response = await fetch("/api/payments/incomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        paymentId: payment.identifier, 
        txid: payment.transaction.txid 
      }),
    });

    if (response.ok) {
      // 2. Si le serveur confirme, on dit au SDK de "compléter" le flux côté client
      // @ts-ignore
      await window.Pi.completePayment(payment.identifier);
      console.log("Paiement incomplet régularisé !");
    }
  } catch (error) {
    console.error("Échec de la récupération du paiement :", error);
  }
};
