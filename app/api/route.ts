import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Récupérer les données envoyées par CinetPay
    // Ils envoient les données en format "form-urlencoded" ou "json"
    const contentType = req.headers.get("content-type");
    let data: any;

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      data = await req.json();
    }

    const { cpm_trans_id, cpm_result, cpm_amount, cpm_currency } = data;

    // 2. Vérification du statut de la transaction
    // 00 = Succès chez CinetPay
    if (cpm_result === "00") {
      
      // LOGIQUE DE CRÉDIT DU COMPTE
      // Ici, tu dois appeler ta base de données (Prisma, Supabase, etc.)
      // pour ajouter le montant au solde de l'utilisateur.
      
      console.log(`Paiement reçu : ${cpm_amount} ${cpm_currency} pour la trans : ${cpm_trans_id}`);
      
      // Exemple de logique (à adapter selon ta DB) :
      // await db.user.update({
      //   where: { id: userIdFromTransId },
      //   data: { balance: { increment: parseFloat(cpm_amount) / 600 } }
      // });

      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("Statut non géré", { status: 200 });

  } catch (error) {
    console.error("Erreur Webhook:", error);
    return new NextResponse("Erreur Interne", { status: 500 });
  }
}
