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
 * Supporte deux modes:
 * 1. A2U (App-to-User) via Pi Platform API - utilise l'UID de l'utilisateur Pi
 * 2. Direct blockchain transfer - utilise l'adresse Stellar (G...)
 * 
 * POST /api/mpay/external-transfer
 * Body: { 
 *   destination: string (Pi address G... ou Pi UID),
 *   amount: number, 
 *   memo?: string,
 *   uid?: string (Pi User ID pour A2U)
 * }
 */

// Configuration Pi Network
const PI_API_URL = process.env.PI_API_URL || "https://api.minepi.com";
const PI_API_KEY = process.env.PI_API_KEY;
const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Network";
const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;

// Helper pour les appels a l'API Pi
async function piApiRequest(endpoint: string, method: string = "GET", body?: any) {
  if (!PI_API_KEY) {
    throw new Error("PI_API_KEY non configure");
  }

  const response = await fetch(`${PI_API_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Key ${PI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Pi API error: ${response.status}`);
  }

  return response.json();
}

// Fonction A2U: Cree un paiement via Pi Platform API
async function createA2UPayment(uid: string, amount: number, memo: string, metadata: any) {
  console.log(`[A2U] Creation paiement: ${amount} Pi vers UID ${uid}`);
  
  const paymentData = await piApiRequest("/v2/payments", "POST", {
    payment: {
      amount,
      memo: memo.slice(0, 140),
      metadata,
      uid
    }
  });

  return {
    paymentId: paymentData.identifier,
    recipientAddress: paymentData.recipient_address,
    amount: paymentData.amount
  };
}

// Fonction pour soumettre la transaction blockchain
async function submitBlockchainTransaction(
  recipientAddress: string,
  amount: number,
  memo: string
): Promise<string> {
  if (!PI_MASTER_SECRET || !PI_MASTER_ADDRESS) {
    throw new Error("Configuration Pi Master Wallet manquante");
  }

  const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
  
  // Charger le compte source
  const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
  
  // Verifier le solde
  const piBalance = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  if (!piBalance || parseFloat(piBalance.balance) < amount + 0.01) {
    throw new Error(`Solde Master Wallet insuffisant`);
  }

  // Construire la transaction
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: recipientAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(memo.slice(0, 28)))
    .setTimeout(180)
    .build();

  // Signer et soumettre
  const keypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  transaction.sign(keypair);

  const result = await server.submitTransaction(transaction);
  return result.hash;
}

// Completer le paiement A2U apres la soumission blockchain
async function completeA2UPayment(paymentId: string, txHash: string) {
  console.log(`[A2U] Completion paiement ${paymentId} avec hash ${txHash}`);
  
  return piApiRequest(`/v2/payments/${paymentId}/complete`, "POST", {
    txid: txHash
  });
}

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
    const { destination, amount, memo, uid } = body;
    const senderId = session.id;

    // 2. Validation de base
    const amountNum = parseFloat(amount);
    if (!destination || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Donnees invalides" 
      }, { status: 400 });
    }

    // 3. Determiner le type de transfert
    const isPiAddress = /^G[A-Z2-7]{55}$/.test(destination);
    const piUid = uid || (!isPiAddress ? destination : null);
    
    // Si ce n'est ni une adresse Pi ni un UID fourni
    if (!isPiAddress && !piUid) {
      return NextResponse.json({ 
        success: false, 
        error: "Format invalide. Fournissez une adresse Pi (G...) ou un UID Pi." 
      }, { status: 400 });
    }

    // 4. Verifier la configuration requise
    const hasA2UConfig = !!PI_API_KEY;
    const hasDirectConfig = !!(PI_MASTER_ADDRESS && PI_MASTER_SECRET);
    
    if (!hasA2UConfig && !hasDirectConfig) {
      return NextResponse.json({ 
        success: false, 
        error: "Service de retrait non configure. Contactez l'administrateur." 
      }, { status: 503 });
    }

    // 5. Calculer les frais
    const feeConfig = await getFeeConfig();
    const { feeAmount: fee, totalDebit: totalDeduction } = calculateFee(amountNum, feeConfig, "withdraw");

    // 6. Verifier le solde de l'utilisateur
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId: senderId, currency: "PI" } }
    });

    if (!senderWallet || senderWallet.balance < totalDeduction) {
      return NextResponse.json({ 
        success: false, 
        error: `Solde insuffisant. Requis: ${totalDeduction.toFixed(4)} Pi (montant + frais)` 
      }, { status: 400 });
    }

    // 7. Creer la transaction en base
    const txRef = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const [withdrawTransaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          reference: txRef,
          amount: amountNum,
          fee: fee,
          netAmount: amountNum,
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.PENDING,
          statusClass: "PROCESSING",
          description: memo || `Retrait Pi: ${isPiAddress ? destination.slice(0, 8) + '...' : 'A2U'}`,
          fromUserId: senderId,
          toUserId: null,
          fromWalletId: senderWallet.id,
          toWalletId: null,
          currency: "PI",
          metadata: {
            externalAddress: isPiAddress ? destination : null,
            piUid: piUid,
            transferType: piUid && hasA2UConfig ? "A2U" : "DIRECT",
            network: PI_NETWORK_PASSPHRASE,
            startedAt: new Date().toISOString()
          }
        }
      }),
      prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } }
      })
    ]);

    // 8. Executer le transfert
    let blockchainTxHash: string | null = null;
    let piPaymentId: string | null = null;
    let recipientAddress = isPiAddress ? destination : null;
    let transferError: string | null = null;

    try {
      // Mode A2U: utilise l'API Pi Platform
      if (piUid && hasA2UConfig) {
        console.log(`[EXTERNAL_TRANSFER] Mode A2U pour UID: ${piUid}`);
        
        // Etape 1: Creer le paiement A2U
        const a2uPayment = await createA2UPayment(
          piUid,
          amountNum,
          memo || `Retrait PimPay ${txRef}`,
          { pimpayRef: txRef, userId: senderId }
        );
        
        piPaymentId = a2uPayment.paymentId;
        recipientAddress = a2uPayment.recipientAddress;
        
        console.log(`[EXTERNAL_TRANSFER] A2U Payment cree: ${piPaymentId}, adresse: ${recipientAddress}`);
        
        // Etape 2: Soumettre la transaction blockchain
        if (hasDirectConfig && recipientAddress) {
          blockchainTxHash = await submitBlockchainTransaction(
            recipientAddress,
            amountNum,
            memo?.slice(0, 28) || `PimPay ${txRef.slice(-8)}`
          );
          
          console.log(`[EXTERNAL_TRANSFER] Transaction soumise: ${blockchainTxHash}`);
          
          // Etape 3: Completer le paiement A2U
          await completeA2UPayment(piPaymentId, blockchainTxHash);
          console.log(`[EXTERNAL_TRANSFER] Paiement A2U complete`);
        } else {
          throw new Error("Configuration Master Wallet requise pour A2U");
        }
      }
      // Mode Direct: transfert blockchain direct
      else if (isPiAddress && hasDirectConfig) {
        console.log(`[EXTERNAL_TRANSFER] Mode Direct vers: ${destination}`);
        
        // Verifier que l'adresse existe
        const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
        try {
          await server.loadAccount(destination);
        } catch (e: any) {
          if (e?.response?.status === 404) {
            throw new Error("L'adresse de destination n'existe pas sur le reseau Pi.");
          }
          throw e;
        }
        
        blockchainTxHash = await submitBlockchainTransaction(
          destination,
          amountNum,
          memo?.slice(0, 28) || `PimPay ${txRef.slice(-8)}`
        );
        
        console.log(`[EXTERNAL_TRANSFER] Transaction directe: ${blockchainTxHash}`);
      }
      else {
        throw new Error("Mode de transfert non supporte avec la configuration actuelle");
      }

    } catch (error: any) {
      transferError = error.message;
      console.error(`[EXTERNAL_TRANSFER] Erreur:`, error);
    }

    // 9. Mettre a jour le statut de la transaction
    if (blockchainTxHash) {
      await prisma.transaction.update({
        where: { id: withdrawTransaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          statusClass: "BROADCASTED",
          blockchainTx: blockchainTxHash,
          metadata: {
            ...(withdrawTransaction.metadata as any || {}),
            piPaymentId,
            recipientAddress,
            blockchainTxHash,
            completedAt: new Date().toISOString()
          }
        }
      });

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

      return NextResponse.json({
        success: true,
        message: "Transfert Pi reussi!",
        data: {
          txid: txRef,
          blockchainTxHash,
          piPaymentId,
          status: "BROADCASTED",
          amount: amountNum,
          fee,
          destination: recipientAddress || destination,
          explorerUrl: `https://blockexplorer.minepi.com/tx/${blockchainTxHash}`
        }
      });

    } else {
      // Echec - rembourser l'utilisateur
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: withdrawTransaction.id },
          data: {
            status: TransactionStatus.FAILED,
            statusClass: "FAILED",
            metadata: {
              ...(withdrawTransaction.metadata as any || {}),
              error: transferError,
              failedAt: new Date().toISOString()
            }
          }
        }),
        prisma.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { increment: totalDeduction } }
        })
      ]);

      return NextResponse.json({
        success: false,
        error: transferError || "Echec du transfert. Votre solde a ete restaure."
      }, { status: 500 });
    }

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
  const hasA2UConfig = !!PI_API_KEY;
  const hasDirectConfig = !!(PI_MASTER_ADDRESS && PI_MASTER_SECRET);
  const isConfigured = hasA2UConfig || hasDirectConfig;
  
  let serverStatus = "unknown";
  let masterBalance = null;
  
  if (hasDirectConfig) {
    try {
      const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
      const account = await server.loadAccount(PI_MASTER_ADDRESS!);
      const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
      masterBalance = nativeBalance?.balance;
      serverStatus = "online";
    } catch {
      serverStatus = "offline";
    }
  } else if (hasA2UConfig) {
    serverStatus = "a2u_only";
  }
  
  return NextResponse.json({
    available: isConfigured,
    status: serverStatus,
    modes: {
      a2u: hasA2UConfig,
      direct: hasDirectConfig
    },
    network: PI_NETWORK_PASSPHRASE?.includes("Testnet") ? "testnet" : "mainnet",
    minWithdraw: 1,
    maxWithdraw: 10000,
    estimatedTime: "1-3 minutes"
  });
}
