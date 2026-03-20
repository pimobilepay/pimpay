export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto'; // Assurez-vous que cette fonction existe
import * as xrpl from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ethers } from 'ethers'; // Pour Sidra et USDT
import { TransactionStatus, TransactionType } from "@prisma/client";

// Configuration des accès réseaux - Utilise les variables d'environnement pour Pi Network
const RPC_URLS = {
  XRP: "wss://s2.ripple.com",
  XLM: "https://horizon.stellar.org",
  PI: process.env.PI_HORIZON_URL || "https://api.testnet.minepi.com", // Testnet par défaut
  SIDRA: "https://node.sidrachain.com",
  EVM_DEFAULT: "https://bsc-dataseed.binance.org"
};

// Passphrase réseau Pi Network - Testnet ou Mainnet
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Testnet";

export async function GET(req: NextRequest) {
  try {
    const processed = await processExternalTransfers();
    return NextResponse.json({ 
      success: true, 
      message: `Mission accomplie Chef ! ${processed} transactions envoyées. Le Praetor 600 est prêt ?` 
    });
  } catch (error: any) {
    console.error("ERREUR WORKER:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function processExternalTransfers() {
  // On récupère les transactions de retrait externes prêtes à être traitées
  // /api/wallet/send crée les transactions avec:
  //   - status: SUCCESS (solde déjà débité)
  //   - statusClass: "QUEUED"
  //   - blockchainTx: null (pas encore broadcasté)
  //   - metadata.isBlockchainWithdraw: true
  const pendingTxs = await prisma.transaction.findMany({
    where: {
      type: TransactionType.WITHDRAW,
      blockchainTx: null, // Pas encore envoyé sur la blockchain
      OR: [
        // Transactions créées par /api/wallet/send (SUCCESS + QUEUED)
        {
          status: TransactionStatus.SUCCESS,
          statusClass: { in: ["QUEUED", "RETRY", null] },
          metadata: { path: ['isBlockchainWithdraw'], equals: true }
        },
        // Transactions créées par /api/user/transfer (PENDING)
        {
          status: TransactionStatus.PENDING,
          metadata: { path: ['pendingWithdrawal'], equals: true }
        },
        // Legacy: transactions PENDING avec flag isExternal
        {
          status: TransactionStatus.PENDING,
          metadata: { path: ['isExternal'], equals: true }
        }
      ],
    },
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  let count = 0;

  for (const tx of pendingTxs) {
    try {
      const metadata = tx.metadata as any;
      const destination = metadata.externalAddress;
      if (!destination) continue;

      let hash = "";

      // Récupération de l'expéditeur pour avoir ses clés privées
      const sender = await prisma.user.findUnique({ where: { id: tx.fromUserId! } });
      if (!sender) throw new Error("Expéditeur introuvable");

      // --- ROUTAGE PAR CRYPTO (Basé sur votre Schéma Prisma) ---
      if (tx.currency === "XRP") {
        hash = await sendXRP(tx, destination, sender.xrpPrivateKey);
      } 
      else if (tx.currency === "PI") {
        // Pi Network: utiliser le MASTER WALLET de PimPay (les fonds sont centralisés)
        // Les utilisateurs déposent vers le master wallet, et on envoie depuis le master wallet
        hash = await sendPiFromMasterWallet(tx, destination);
      }
      else if (tx.currency === "XLM") {
        // Stellar public: utiliser la clé de l'utilisateur (wallet décentralisé)
        hash = await sendStellarBased(tx, destination, sender.stellarPrivateKey);
      } 
      else if (tx.currency === "SIDRA" || tx.currency === "SDA") {
        hash = await sendEVM(tx, destination, sender.sidraPrivateKey, RPC_URLS.SIDRA);
      } 
      else if (tx.currency === "USDT") {
        hash = await sendEVM(tx, destination, sender.usdtPrivateKey, RPC_URLS.EVM_DEFAULT);
      }

      if (hash) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { 
            blockchainTx: hash,
            status: TransactionStatus.SUCCESS 
          }
        });
        count++;
      }
    } catch (err: any) {
      console.error(`Erreur sur TX ${tx.reference}:`, err?.message || err);
      // Marquer la transaction comme FAILED apres une erreur pour eviter les boucles infinies
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...(tx.metadata as any),
            workerError: err?.message || "Erreur inconnue",
            failedAt: new Date().toISOString(),
          },
        },
      }).catch(() => {});
    }
  }
  return count;
}

// --- LOGIQUE PI A2U (App-to-User Payment) ---
// Pi Network requiert un flux spécifique pour les paiements A2U:
// 1. Créer le paiement via l'API Pi (avec l'UID de l'utilisateur)
// 2. Soumettre la transaction blockchain avec le paymentIdentifier comme memo
// 3. Compléter le paiement via l'API Pi
//
// IMPORTANT: Si l'utilisateur n'a pas de piUid stocké, on utilise le transfert direct
// vers son adresse wallet (moins optimal mais fonctionne pour les wallets activés)
async function sendPiFromMasterWallet(tx: any, dest: string): Promise<string> {
  const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;
  const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
  const PI_API_KEY = process.env.PI_API_KEY;
  
  if (!PI_MASTER_SECRET || !PI_MASTER_ADDRESS) {
    throw new Error("Configuration Pi Network manquante: PI_MASTER_WALLET_SECRET ou PI_MASTER_WALLET_ADDRESS");
  }
  
  // Récupérer les metadata de la transaction
  const metadata = tx.metadata as any;
  const userPiUid = metadata?.piUid; // UID Pi de l'utilisateur (si disponible)
  
  // Déterminer l'URL de l'API Pi (testnet ou mainnet)
  const isTestnet = PI_NETWORK_PASSPHRASE.includes("Testnet");
  const PI_API_URL = isTestnet 
    ? "https://api.testnet.minepi.com" 
    : "https://api.minepi.com";
  
  console.log(`[PI_A2U] Configuration:`, {
    horizonUrl: RPC_URLS.PI,
    apiUrl: PI_API_URL,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
    masterAddress: PI_MASTER_ADDRESS.substring(0, 10) + "...",
    destination: dest,
    userPiUid: userPiUid ? userPiUid.substring(0, 8) + "..." : "N/A",
    amount: tx.amount,
    isTestnet
  });
  
  // Si on a l'UID Pi de l'utilisateur ET une API key, utiliser le flux A2U officiel
  if (userPiUid && PI_API_KEY) {
    return await sendPiA2UOfficial(tx, userPiUid, PI_API_KEY, PI_API_URL);
  }
  
  // Sinon, utiliser le transfert direct vers l'adresse wallet
  console.log(`[PI_A2U] Pas d'UID Pi ou d'API key, utilisation du transfert direct vers ${dest}`);
  return await sendPiDirectTransfer(tx, dest);
}

// Flux A2U officiel via l'API Pi Network
async function sendPiA2UOfficial(
  tx: any, 
  userUid: string, 
  apiKey: string,
  apiUrl: string
): Promise<string> {
  const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET!;
  const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS!;
  
  // Étape 1: Créer le paiement via l'API Pi
  console.log(`[PI_A2U] Étape 1: Création du paiement via API Pi...`);
  
  const createPaymentResponse = await fetch(`${apiUrl}/v2/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Number(tx.amount),
      memo: `PimPay: ${tx.reference || 'Retrait'}`,
      metadata: { 
        transactionId: tx.id,
        reference: tx.reference,
        platform: "PimPay"
      },
      uid: userUid
    })
  });
  
  if (!createPaymentResponse.ok) {
    const errorData = await createPaymentResponse.text();
    console.error(`[PI_A2U] Erreur création paiement:`, errorData);
    throw new Error(`Erreur API Pi lors de la création du paiement: ${errorData}`);
  }
  
  const paymentData = await createPaymentResponse.json();
  const paymentIdentifier = paymentData.identifier;
  const recipientAddress = paymentData.recipient;
  
  console.log(`[PI_A2U] Paiement créé:`, { 
    paymentIdentifier, 
    recipientAddress: recipientAddress?.substring(0, 10) + "..." 
  });
  
  // Étape 2: Charger le compte et construire la transaction
  console.log(`[PI_A2U] Étape 2: Construction de la transaction blockchain...`);
  
  const server = new StellarSdk.Horizon.Server(RPC_URLS.PI, { 
    allowHttp: RPC_URLS.PI.includes("localhost") 
  });
  
  const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
  const baseFee = await server.fetchBaseFee();
  
  // Vérifier le solde
  const piBalance = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  if (!piBalance || parseFloat(piBalance.balance) < tx.amount) {
    throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI`);
  }
  
  // Étape 3: Construire la transaction avec le paymentIdentifier comme MEMO (obligatoire!)
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: baseFee.toString(),
    networkPassphrase: PI_NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: recipientAddress,
        asset: StellarSdk.Asset.native(),
        amount: tx.amount.toFixed(7),
      })
    )
    // IMPORTANT: Le memo DOIT être le paymentIdentifier pour que Pi Network lie la transaction
    .addMemo(StellarSdk.Memo.text(paymentIdentifier))
    .setTimeout(180)
    .build();
  
  // Étape 4: Signer la transaction
  console.log(`[PI_A2U] Étape 4: Signature de la transaction...`);
  const sourceKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  transaction.sign(sourceKeypair);
  
  // Étape 5: Soumettre la transaction à la blockchain Pi
  console.log(`[PI_A2U] Étape 5: Soumission à la blockchain Pi...`);
  const submitResult = await server.submitTransaction(transaction);
  
  if (!submitResult.successful) {
    throw new Error(`Transaction blockchain échouée: ${JSON.stringify(submitResult.extras?.result_codes)}`);
  }
  
  const txid = submitResult.hash;
  console.log(`[PI_A2U] Transaction soumise: ${txid}`);
  
  // Étape 6: Compléter le paiement via l'API Pi
  console.log(`[PI_A2U] Étape 6: Complétion du paiement via API Pi...`);
  
  const completeResponse = await fetch(`${apiUrl}/v2/payments/${paymentIdentifier}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ txid })
  });
  
  if (!completeResponse.ok) {
    const errorData = await completeResponse.text();
    console.error(`[PI_A2U] Erreur complétion paiement:`, errorData);
    // La transaction blockchain est déjà soumise, on retourne quand même le hash
    // mais on log l'erreur pour investigation
  } else {
    console.log(`[PI_A2U] Paiement complété avec succès!`);
  }
  
  return txid;
}

// Transfert direct vers une adresse wallet (fallback si pas d'UID Pi)
async function sendPiDirectTransfer(tx: any, dest: string): Promise<string> {
  const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET!;
  const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS!;
  
  // Valider l'adresse de destination (format Stellar Ed25519)
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(dest)) {
    throw new Error(`Adresse Pi invalide: ${dest}`);
  }
  
  const server = new StellarSdk.Horizon.Server(RPC_URLS.PI, { 
    allowHttp: RPC_URLS.PI.includes("localhost") 
  });
  
  // Charger le compte master
  const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
  
  // Vérifier le solde
  const piBalance = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  if (!piBalance || parseFloat(piBalance.balance) < tx.amount) {
    throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI`);
  }
  
  // Construire la transaction
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: dest,
        asset: StellarSdk.Asset.native(),
        amount: tx.amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(tx.reference?.substring(0, 28) || "PimPay"))
    .setTimeout(180)
    .build();
  
  // Signer avec la clé secrète du master wallet
  const sourceKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  transaction.sign(sourceKeypair);
  
  // Soumettre
  const result = await server.submitTransaction(transaction);
  
  if (!result.successful) {
    const codes = (result as any).extras?.result_codes;
    if (codes?.operations?.includes("op_no_destination")) {
      throw new Error("Le compte destinataire n'existe pas sur Pi Network. L'utilisateur doit d'abord activer son wallet Pi.");
    }
    throw new Error(`Transaction échouée: ${JSON.stringify(codes || result)}`);
  }
  
  console.log(`[PI_DIRECT] Transaction soumise avec succès: ${result.hash}`);
  return result.hash;
}

// --- LOGIQUE XRP ---
async function sendXRP(tx: any, dest: string, encryptedKey: string | null) {
  if (!encryptedKey) throw new Error("Clé XRP manquante");
  const client = new xrpl.Client(RPC_URLS.XRP);
  await client.connect();
  const wallet = xrpl.Wallet.fromSeed(decrypt(encryptedKey));
  const result = await client.submitAndWait({
    TransactionType: "Payment",
    Account: wallet.address,
    Amount: xrpl.xrpToDrops(tx.amount.toString()),
    Destination: dest
  });
  await client.disconnect();
  return (result.result.meta as any).TransactionResult === "tesSUCCESS" ? result.result.hash : null;
}

// --- LOGIQUE PI / XLM ---
async function sendStellarBased(tx: any, dest: string, encryptedKey: string | null) {
  if (!encryptedKey) throw new Error("Clé Stellar/Pi manquante");
  
  const isPi = tx.currency === "PI";
  const url = isPi ? RPC_URLS.PI : RPC_URLS.XLM;
  
  // Utiliser la passphrase depuis l'environnement pour Pi, sinon réseau public Stellar
  const networkPassphrase = isPi ? PI_NETWORK_PASSPHRASE : StellarSdk.Networks.PUBLIC;
  
  const server = new StellarSdk.Horizon.Server(url, { allowHttp: url.includes("localhost") });
  
  // Décrypter la clé si elle est chiffrée (format iv:data)
  let secretKey = encryptedKey;
  if (encryptedKey.includes(':')) {
    secretKey = decrypt(encryptedKey);
  }
  
  const keys = StellarSdk.Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keys.publicKey());
  
  console.log(`[PI_WORKER] Envoi ${tx.amount} ${tx.currency} vers ${dest}`);
  console.log(`[PI_WORKER] Horizon URL: ${url}, Passphrase: ${networkPassphrase}`);
  
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: networkPassphrase
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: dest,
      asset: StellarSdk.Asset.native(),
      amount: tx.amount.toFixed(7) // Stellar utilise 7 décimales max
    }))
    .addMemo(StellarSdk.Memo.text(tx.reference?.substring(0, 28) || "PimPay"))
    .setTimeout(180) // 3 minutes timeout
    .build();
    
  transaction.sign(keys);
  const result = await server.submitTransaction(transaction);
  
  console.log(`[PI_WORKER] Transaction soumise: ${result.hash}`);
  return result.hash;
}

// --- LOGIQUE EVM (Sidra, USDT) ---
async function sendEVM(tx: any, dest: string, encryptedKey: string | null, rpc: string) {
  if (!encryptedKey) throw new Error(`Clé ${tx.currency} manquante`);
  
  // Gérer les clés chiffrées et non chiffrées (legacy)
  let privateKey = encryptedKey;
  if (encryptedKey.includes(':')) {
    // Clé chiffrée (format: iv:encryptedData)
    privateKey = decrypt(encryptedKey);
  }
  // Si la clé commence par 0x, c'est déjà une clé privée valide
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Envoi de la monnaie native (SDA ou BNB/ETH selon le réseau)
  const response = await wallet.sendTransaction({
    to: dest,
    value: ethers.parseEther(tx.amount.toString())
  });
  
  // Attendre la confirmation de la transaction
  const receipt = await response.wait();
  return receipt?.hash || response.hash;
}
