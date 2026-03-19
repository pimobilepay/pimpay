import axios from 'axios';

// Remplace par ta clé API du Developer Portal
const PI_API_KEY = "ir14okirkx1xvf9xdms3ygmu5skixbxtwoeuxrktk7zpalo2vy7q9pma7jpfjipi"; 

async function checkPaymentStatus(paymentId: string) {
  try {
    const response = await axios.get(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`
      }
    });

    const payment = response.data;

    console.log("=== Détails du Paiement ===");
    console.log(`ID: ${payment.id}`);
    console.log(`Montant: ${payment.amount} ${payment.currency}`);
    console.log(`Statut Pi: ${payment.status.developer_approved ? 'Approuvé' : 'En attente'}`);
    console.log(`Transaction Blockchain: ${payment.status.blockchain_committed ? 'OUI' : 'NON'}`);
    console.log(`Exécution complète: ${payment.status.developer_completed ? 'OUI' : 'NON'}`);
    
    if (payment.transaction) {
      console.log(`TXID (Hash): ${payment.transaction.txid}`);
    } else {
      console.log("⚠️ Aucune transaction n'a encore été soumise à la blockchain.");
    }

  } catch (error: any) {
    console.error("Erreur lors de la récupération :", error.response?.data || error.message);
  }
}

// Remplace par l'ID d'une de tes transactions qui pose problème
checkPaymentStatus("METTRE_ICI_L_ID_DU_PAIEMENT");
