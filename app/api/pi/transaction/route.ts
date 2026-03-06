export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { nanoid } from 'nanoid';

// FONCTION DE VÉRIFICATION DU TOKEN
async function getAuthUser() {
  const cookieStore = await cookies();
  const SECRET = process.env.JWT_SECRET;
  const token = cookieStore.get("pimpay_token")?.value || cookieStore.get("token")?.value;
  if (!token || !SECRET) return null;
  try {
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return payload.id as string;
  } catch { return null; }
}

// POST : CRÉATION DE LA TRANSACTION
// IMPORTANT: Pour Pi Network, on ne crée PAS de transaction ici.
// La transaction sera créée uniquement après confirmation réelle par Pi Network.
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    
    const body = await req.json();
    const { amount, fee, type, currency, method, operatorId, accountNumber, countryCode, description, paymentId, txid } = body;

    const parsedAmount = parseFloat(amount);

    // Pour Pi Network: on ne crée la transaction QUE si paymentId et txid sont fournis
    // (cela signifie que le paiement a été effectué sur Pi SDK)
    if (currency === "PI") {
      if (!paymentId || !txid) {
        // Retourner un "intent" sans créer de transaction
        // La vraie transaction sera créée après confirmation Pi Network
        return NextResponse.json({
          intent: true,
          message: "Intent de dépôt Pi enregistré. Effectuez le paiement sur Pi SDK.",
          amount: parsedAmount,
          currency: "PI",
          userId
        });
      }

      // Vérifier que le paiement n'existe pas déjà
      const existingPiTx = await prisma.transaction.findFirst({
        where: {
          OR: [
            { externalId: paymentId },
            { blockchainTx: txid }
          ]
        }
      });

      if (existingPiTx) {
        return NextResponse.json({ 
          error: "Cette transaction Pi a déjà été traitée.",
          transaction: existingPiTx 
        }, { status: 409 });
      }
    }

    // 1. ANTI-DOUBLON (IDEMPOTENCE) - seulement pour les autres devises
    if (currency !== "PI") {
      const existingTx = await prisma.transaction.findFirst({
        where: {
          fromUserId: userId,
          amount: parsedAmount,
          currency: currency || "USD",
          status: "PENDING",
          createdAt: { gte: new Date(Date.now() - 30 * 1000) } // 30 secondes
        }
      });

      if (existingTx) {
        return NextResponse.json({ error: "Transaction déjà en cours, veuillez patienter." }, { status: 409 });
      }
    }

    // 2. GÉNÉRATION RÉFÉRENCE
    const reference = `PP-${nanoid(10).toUpperCase()}`;

    // 3. CRÉATION
    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: parsedAmount,
        fee: parseFloat(fee || 0),
        netAmount: parsedAmount - parseFloat(fee || 0),
        currency: currency || "USD",
        type: type || "DEPOSIT",
        status: currency === "PI" ? "PENDING" : "PENDING", // Pi: sera mis à jour après validation
        description: description || `Dépôt via ${method}`,
        operatorId,
        accountNumber: currency === "PI" ? "PI_NETWORK" : accountNumber,
        countryCode,
        fromUserId: userId,
        toUserId: userId, // Pour les dépôts, l'utilisateur est aussi le destinataire
        externalId: currency === "PI" ? paymentId : undefined,
        blockchainTx: currency === "PI" ? txid : undefined,
      }
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("❌ POST_TX_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

// GET : RÉCUPÉRATION DU DÉTAIL
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid");
    const ref = searchParams.get("ref");
    const id = searchParams.get("id");

    const transaction = await prisma.transaction.findFirst({
      where: {
        AND: [
          { OR: [{ fromUserId: userId }, { toUserId: userId }] },
          { 
            OR: [
              ...(txid ? [{ blockchainTx: txid }] : []), 
              ...(ref ? [{ reference: ref }] : []), 
              ...(ref ? [{ externalId: ref }] : []),
              ...(id ? [{ id: id }] : [])
            ] 
          }
        ]
      },
      include: {
        fromUser: { select: { username: true, firstName: true, avatar: true, phone: true } },
        toUser: { select: { username: true, firstName: true, avatar: true, phone: true } },
      }
    });

    if (!transaction) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

    return NextResponse.json({
      ...transaction,
      // On s'assure que la méthode est bien renvoyée pour le Summary
      method: transaction.currency === "PI" ? "Pi Network" : (transaction.description?.includes('via') ? transaction.description.split('via ')[1] : "Mobile Money")
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
