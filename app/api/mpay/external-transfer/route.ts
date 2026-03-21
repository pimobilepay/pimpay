export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { TransactionStatus, TransactionType } from '@prisma/client';

/**
 * API pour les transferts Pi vers des adresses externes (Pi Wallet)
 * 
 * POST /api/mpay/external-transfer
 * Body: { destination: string (Pi address), amount: number, memo?: string }
 * 
 * Cette API cree une transaction de retrait qui sera traitee par le worker.
 * Le worker effectuera le transfert blockchain vers l'adresse externe.
 */

// Configuration Pi Network
const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.testnet.minepi.com";
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Testnet";
const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Non autorise" 
      }, { status: 401 });
    }

    const body = await req.json();
    const { destination, amount, memo } = body;
    const senderId = session.id;

    // 2. Validation de base
    const amountNum = parseFloat(amount);
    if (!destination || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Donnees invalides" 
      }, { status: 400 });
    }

    // 3. Valider le format de l'adresse Pi (format Stellar G...)
    const isPiAddress = /^G[A-Z2-7]{55}$/.test(destination);
    if (!isPiAddress) {
      return NextResponse.json({ 
        success: false, 
        error: "Format d'adresse Pi invalide. L'adresse doit commencer par G et contenir 56 caracteres." 
      }, { status: 400 });
    }

    // Validation additionnelle avec Stellar SDK
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
      return NextResponse.json({ 
        success: false, 
        error: "Adresse Pi invalide (verification cryptographique echouee)" 
      }, { status: 400 });
    }

    // 4. Calculer les frais
    const feeConfig = await getFeeConfig();
    // Les retraits externes ont des frais plus eleves (type "withdraw")
    const { feeAmount: fee, totalDebit: totalDeduction } = calculateFee(amountNum, feeConfig, "withdraw");

    // 5. Verifier le solde de l'utilisateur
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId: senderId, currency: "PI" } }
    });

    if (!senderWallet || senderWallet.balance < totalDeduction) {
      return NextResponse.json({ 
        success: false, 
        error: `Solde insuffisant. Requis: ${totalDeduction.toFixed(4)} Pi (montant + frais)` 
      }, { status: 400 });
    }

    // 6. Optionnel: Verifier l'adresse de destination si Horizon est configure
    // Ne pas bloquer si le serveur n'est pas accessible
    let addressVerified = false;
    try {
      const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
      await server.loadAccount(destination);
      addressVerified = true;
      console.log(`[EXTERNAL_TRANSFER] Adresse verifiee: ${destination}`);
    } catch (destError: any) {
      if (destError?.response?.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: "L'adresse de destination n'existe pas sur le reseau Pi. Verifiez que le destinataire a active son wallet Pi." 
        }, { status: 400 });
      }
      // Autres erreurs (connexion, etc.) - on continue quand meme
      console.warn(`[EXTERNAL_TRANSFER] Verification Horizon non disponible:`, destError.message);
    }

    // 7. Creer la transaction de retrait en file d'attente (QUEUED pour le worker)
    const txRef = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Utiliser une transaction atomique pour debiter et creer l'enregistrement
    const [withdrawTransaction] = await prisma.$transaction([
      // Creer la transaction de retrait
      prisma.transaction.create({
        data: {
          reference: txRef,
          amount: amountNum,
          fee: fee,
          netAmount: amountNum,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.SUCCESS, // SUCCESS pour que le worker le traite
          statusClass: "QUEUED", // En attente du worker pour le broadcast blockchain
          description: memo || `Retrait vers Pi Wallet: ${destination.slice(0, 8)}...${destination.slice(-4)}`,
          fromUserId: senderId,
          toUserId: null,
          fromWalletId: senderWallet.id,
          toWalletId: null,
          currency: "PI",
          metadata: {
            externalAddress: destination,
            transferType: "PI_EXTERNAL",
            addressVerified: addressVerified,
            network: PI_NETWORK_PASSPHRASE,
            horizon: PI_HORIZON_URL,
            queuedAt: new Date().toISOString()
          }
        }
      }),
      // Debiter le wallet de l'utilisateur
      prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } }
      })
    ]);

    console.log(`[EXTERNAL_TRANSFER] Transaction ${txRef} creee et mise en file d'attente`);

    // Mettre a jour les stats globales
    await prisma.systemConfig.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: {
        totalVolumePi: { increment: amountNum },
        totalProfit: { increment: fee }
      },
      create: {
        id: "GLOBAL_CONFIG",
        totalVolumePi: amountNum,
        totalProfit: fee
      }
    }).catch(() => {});

    // Retourner succes - la transaction sera traitee par le worker
    return NextResponse.json({
      success: true,
      message: "Retrait en cours de traitement. Le transfert blockchain sera effectue sous peu.",
      data: {
        txid: txRef,
        status: "QUEUED",
        amount: amountNum,
        fee: fee,
        destination: destination,
        estimatedTime: "1-5 minutes",
        note: "Le transfert blockchain est en cours de traitement par notre systeme."
      }
    });

  } catch (error: any) {
    console.error("[EXTERNAL_TRANSFER] Erreur inattendue:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur lors du transfert externe"
    }, { status: 500 });
  }
}

// GET: Verifier le statut du service de retrait externe
export async function GET() {
  const isConfigured = !!(PI_MASTER_ADDRESS && PI_MASTER_SECRET && PI_HORIZON_URL);
  
  let serverStatus = "unknown";
  let masterBalance = null;
  
  if (isConfigured) {
    try {
      const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
      const account = await server.loadAccount(PI_MASTER_ADDRESS!);
      const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
      masterBalance = nativeBalance?.balance;
      serverStatus = "online";
    } catch {
      serverStatus = "offline";
    }
  }
  
  return NextResponse.json({
    available: isConfigured && serverStatus === "online",
    status: serverStatus,
    network: PI_NETWORK_PASSPHRASE?.includes("Testnet") ? "testnet" : "mainnet",
    minWithdraw: 1,
    maxWithdraw: 10000,
    estimatedTime: "1-5 minutes"
  });
}
