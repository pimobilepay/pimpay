export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';

/**
 * API pour les transferts Pi vers des adresses externes (Pi Wallet)
 * 
 * POST /api/mpay/external-transfer
 * Body: { destination: string (Pi address), amount: number, memo?: string }
 * 
 * Cette API effectue un transfert blockchain reel vers une adresse Pi externe.
 */

// Configuration Pi Network
const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Network";
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

    // 4. Verifier la configuration du serveur
    if (!PI_MASTER_ADDRESS || !PI_MASTER_SECRET) {
      console.error("[EXTERNAL_TRANSFER] Configuration Pi incomplete");
      return NextResponse.json({ 
        success: false, 
        error: "Service de retrait temporairement indisponible. Configuration en attente." 
      }, { status: 503 });
    }

    // 5. Calculer les frais
    const feeConfig = await getFeeConfig();
    // Les retraits externes ont des frais plus eleves (type "withdraw")
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

    // 7. Verifier que l'adresse de destination existe sur le reseau Pi
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
    
    try {
      await server.loadAccount(destination);
    } catch (destError: any) {
      if (destError?.response?.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: "L'adresse de destination n'existe pas sur le reseau Pi. Verifiez que le destinataire a active son wallet Pi." 
        }, { status: 400 });
      }
      throw destError;
    }

    // 8. Verifier le solde du wallet master
    const masterAccount = await server.loadAccount(PI_MASTER_ADDRESS);
    const masterBalance = masterAccount.balances.find((b: any) => b.asset_type === "native");
    
    if (!masterBalance || parseFloat(masterBalance.balance) < amountNum + 0.01) {
      console.error("[EXTERNAL_TRANSFER] Solde master insuffisant:", masterBalance?.balance);
      return NextResponse.json({ 
        success: false, 
        error: "Service temporairement indisponible. Reserves insuffisantes." 
      }, { status: 503 });
    }

    // 9. Creer l'enregistrement de transaction en PENDING
    const txRef = `EXT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const pendingTransaction = await prisma.transaction.create({
      data: {
        reference: txRef,
        amount: amountNum,
        fee: fee,
        netAmount: amountNum,
        type: "WITHDRAW",
        status: "PENDING",
        description: memo || `Retrait vers Pi Wallet: ${destination.slice(0, 8)}...${destination.slice(-4)}`,
        fromUserId: senderId,
        toUserId: null,
        fromWalletId: senderWallet.id,
        toWalletId: null,
        currency: "PI",
        metadata: {
          externalAddress: destination,
          transferType: "PI_EXTERNAL",
          horizon: PI_HORIZON_URL
        }
      }
    });

    // 10. Debiter le wallet de l'utilisateur
    await prisma.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: { decrement: totalDeduction } }
    });

    // 11. Construire et signer la transaction blockchain
    let blockchainTxHash = null;
    let blockchainError = null;

    try {
      console.log(`[EXTERNAL_TRANSFER] Construction de la transaction: ${amountNum} Pi vers ${destination}`);
      
      const transaction = new StellarSdk.TransactionBuilder(masterAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: PI_NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amountNum.toFixed(7),
          })
        )
        .addMemo(StellarSdk.Memo.text(memo?.slice(0, 28) || "PimPay Withdraw"))
        .setTimeout(180)
        .build();

      // Signer avec la cle master
      const keypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
      transaction.sign(keypair);

      // Soumettre a la blockchain
      console.log(`[EXTERNAL_TRANSFER] Soumission de la transaction...`);
      const result = await server.submitTransaction(transaction);
      
      blockchainTxHash = result.hash;
      console.log(`[EXTERNAL_TRANSFER] Transaction reussie! Hash: ${blockchainTxHash}`);

    } catch (txError: any) {
      console.error("[EXTERNAL_TRANSFER] Erreur blockchain:", txError);
      blockchainError = txError.message;
      
      // Extraire les codes d'erreur Stellar si disponibles
      const resultCodes = txError.response?.data?.extras?.result_codes;
      if (resultCodes) {
        console.error("[EXTERNAL_TRANSFER] Codes erreur Stellar:", resultCodes);
        
        if (resultCodes.operations?.includes("op_no_destination")) {
          blockchainError = "Le compte de destination n'existe pas sur la blockchain Pi.";
        } else if (resultCodes.operations?.includes("op_underfunded")) {
          blockchainError = "Fonds insuffisants sur le wallet de reserve.";
        }
      }
    }

    // 12. Mettre a jour le statut de la transaction
    if (blockchainTxHash) {
      await prisma.transaction.update({
        where: { id: pendingTransaction.id },
        data: {
          status: "SUCCESS",
          metadata: {
            externalAddress: destination,
            transferType: "PI_EXTERNAL",
            blockchainTxHash: blockchainTxHash,
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
        message: "Transfert vers Pi Wallet reussi!",
        data: {
          txid: txRef,
          blockchainTxHash: blockchainTxHash,
          amount: amountNum,
          fee: fee,
          destination: destination,
          explorerUrl: `https://pi-blockchain.net/tx/${blockchainTxHash}`
        }
      });

    } else {
      // Echec blockchain - rembourser l'utilisateur
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: pendingTransaction.id },
          data: {
            status: "FAILED",
            metadata: {
              externalAddress: destination,
              transferType: "PI_EXTERNAL",
              error: blockchainError,
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
        error: blockchainError || "Echec de la transaction blockchain. Votre solde a ete restaure."
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
