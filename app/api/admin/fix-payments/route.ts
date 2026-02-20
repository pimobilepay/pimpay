import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const PI_API_KEY = process.env.PI_API_KEY;

  try {
    // 1. Demander à Pi Network la liste des paiements bloqués pour ton App
    const response = await axios.get("https://api.minepi.com/v2/payments/incomplete", {
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });

    const incompletePayments = response.data.incomplete_payments;

    if (!incompletePayments || incompletePayments.length === 0) {
      return NextResponse.json({ message: "Aucun paiement bloqué trouvé." });
    }

    // 2. Boucler sur chaque paiement pour le débloquer
    const results = await Promise.all(incompletePayments.map(async (payment: any) => {
      try {
        // Option A : Essayer de l'annuler (si aucune transaction blockchain n'existe)
        // Note: Le SDK Pi ne permet pas d'annuler via API facilement, 
        // on essaie donc de voir son statut exact d'abord.
        
        console.log(`Traitement du paiement: ${payment.identifier}`);
        
        // Si le paiement a un txid, on essaie de le compléter pour débloquer l'utilisateur
        if (payment.transaction && payment.transaction.txid) {
           await axios.post(
            `https://api.minepi.com/v2/payments/${payment.identifier}/complete`,
            { txid: payment.transaction.txid },
            { headers: { Authorization: `Key ${PI_API_KEY}` } }
          );
          return { id: payment.identifier, status: "COMPLETED_BY_FORCE" };
        } else {
          // Sinon, on le laisse expirer ou on utilise le callback d'annulation
          return { id: payment.identifier, status: "PENDING_NO_TX" };
        }
      } catch (err: any) {
        return { id: payment.identifier, error: err.message };
      }
    }));

    return NextResponse.json({ 
      message: "Nettoyage terminé", 
      details: results 
    });

  } catch (error: any) {
    console.error("Erreur Cleanup Pi:", error.response?.data || error.message);
    return NextResponse.json({ error: "Erreur lors du nettoyage" }, { status: 500 });
  }
}

