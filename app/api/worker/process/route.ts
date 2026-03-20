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

// --- LOGIQUE PI (Master Wallet) ---
// Pi Network utilise un modèle centralisé: les utilisateurs déposent sur le master wallet
// et les retraits sont envoyés depuis le master wallet vers l'adresse externe
async function sendPiFromMasterWallet(tx: any, dest: string): Promise<string> {
  const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;
  const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
  
  if (!PI_MASTER_SECRET || !PI_MASTER_ADDRESS) {
    throw new Error("Configuration Pi Network manquante: PI_MASTER_WALLET_SECRET ou PI_MASTER_WALLET_ADDRESS");
  }
  
  // Valider l'adresse de destination (format Stellar Ed25519)
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(dest)) {
    throw new Error(`Adresse Pi invalide: ${dest}`);
  }
  
  console.log(`[PI_MASTER_WALLET] Configuration:`, {
    horizonUrl: RPC_URLS.PI,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
    masterAddress: PI_MASTER_ADDRESS.substring(0, 10) + "...",
    destination: dest,
    amount: tx.amount,
    isTestnet: RPC_URLS.PI.includes("testnet") || PI_NETWORK_PASSPHRASE.includes("Testnet")
  });
  
  try {
    const server = new StellarSdk.Horizon.Server(RPC_URLS.PI, { 
      allowHttp: RPC_URLS.PI.includes("localhost") 
    });
    
    // Charger le compte master
    const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
    
    // Vérifier le solde
    const piBalance = sourceAccount.balances.find(
      (b: any) => b.asset_type === "native"
    );
    
    if (!piBalance || parseFloat(piBalance.balance) < tx.amount) {
      throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI, Requis: ${tx.amount} PI`);
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
      throw new Error(`Transaction échouée: ${JSON.stringify(result.extras?.result_codes || result)}`);
    }
    
    console.log(`[PI_MASTER_WALLET] Transaction soumise avec succès: ${result.hash}`);
    return result.hash;
    
  } catch (error: any) {
    // Gestion des erreurs Horizon
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      console.error(`[PI_MASTER_WALLET_ERROR] Codes Horizon:`, codes);
      
      if (codes.operations?.includes("op_no_destination")) {
        throw new Error("Le compte destinataire n'existe pas sur Pi Network. L'utilisateur doit d'abord activer son wallet.");
      }
      if (codes.operations?.includes("op_underfunded")) {
        throw new Error("Solde Master Wallet insuffisant.");
      }
    }
    
    console.error(`[PI_MASTER_WALLET_ERROR]`, error.message);
    throw new Error(`Erreur Pi Network: ${error.message}`);
  }
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
