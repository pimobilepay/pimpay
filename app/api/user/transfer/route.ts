export async function POST(req: NextRequest) {
  try {
    // 1. Vérification JWT
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const SECRET = process.env.JWT_SECRET;
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    if (!senderId) throw new Error("ID utilisateur introuvable dans le token.");

    // 2. Parsing du Body
    const body = await req.json();
    const amount = parseFloat(body.amount);
    const requestedCurrency = (body.currency || "XAF").toUpperCase().trim();

    // 3. Résolution de la devise (Crucial pour ton index @@unique)
    // On s'assure que transferCurrency n'est JAMAIS vide
    const transferCurrency = requestedCurrency; 

    if (isNaN(amount) || amount <= 0) throw new Error("Montant invalide.");

    // 4. Exécution de la Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // Sécurité : On vérifie l'existence du wallet avec l'index défini dans le schéma
      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId_currency: {
            userId: senderId,
            currency: transferCurrency
          }
        }
      });

      if (!senderWallet) {
        throw new Error(`Vous n'avez pas de portefeuille en ${transferCurrency}.`);
      }

      // Calcul des frais (référé à ton modèle SystemConfig)
      const config = await tx.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const fee = config?.transactionFee ?? 0.01;
      const totalDebit = amount + fee;

      if (senderWallet.balance < totalDebit) {
        throw new Error(`Solde insuffisant. Disponible: ${senderWallet.balance} ${transferCurrency}`);
      }

      // Mise à jour des soldes
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDebit } }
      });

      // Logique pour le destinataire (exemple interne simplifié)
      // On utilise upsert comme tu l'as fait, c'est parfait pour la cohérence
      
      // ... reste de ta logique de création de transaction ...
      
      return tx.transaction.create({
        data: {
          reference: `PIM-TR-${nanoid(10).toUpperCase()}`,
          amount: amount,
          fee: fee,
          currency: transferCurrency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          fromUserId: senderId,
          fromWalletId: senderWallet.id,
          // ... destinataire
        }
      });
    }, {
      timeout: 15000 // On réduit un peu le timeout pour ne pas bloquer la DB trop longtemps
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ Erreur Transaction:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
