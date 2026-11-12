export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto'; // Assurez-vous que cette fonction existe
import * as xrpl from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ethers } from 'ethers'; // Pour Sidra et USDT
import { TronWeb } from "tronweb";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { completePiPayment, getPiNetworkConfig, verifyPiHorizonNetwork } from "@/lib/pi";

const RPC_URLS = {
  XRP: "wss://s2.ripple.com",
  XLM: "https://horizon.stellar.org",
  SIDRA: "https://node.sidrachain.com",
  EVM_DEFAULT: "https://bsc-dataseed.binance.org"
};

export async function GET(req: NextRequest) {
  // [FIX V3] — Vérification WORKER_SECRET obligatoire
  // Le worker doit envoyer x-worker-secret: <WORKER_SECRET> OU Authorization: Bearer <WORKER_SECRET>
  const workerSecret = process.env.WORKER_SECRET;
  const headerSecret = req.headers.get("x-worker-secret")
    || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!workerSecret || !headerSecret || headerSecret !== workerSecret) {
    console.warn("[v0] [WORKER] Accès refusé — secret invalide ou manquant");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[v0] [WORKER] Demarrage du worker process...`);

  try {
    const processed = await processExternalTransfers();
    console.log(`[v0] [WORKER] Termine avec ${processed} transactions traitees`);
    return NextResponse.json({ 
      success: true, 
      message: `Mission accomplie Chef ! ${processed} transactions envoyées.`,
      processed
    });
  } catch (error: any) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("[v0] [WORKER] ERREUR:", error.message, error.stack);
    return NextResponse.json({ success: false, error: "Erreur interne du worker" }, { status: 500 });
  }
}

async function sendTRX(tx: any, destination: string, encryptedPrivateKey: string | null) {
  if (!encryptedPrivateKey) throw new Error("Clé privée TRON manquante");
  const sourceAddress = tx.metadata?.sourceAddress;
  const sender = await prisma.user.findUnique({
    where: { id: tx.fromUserId },
    select: { usdtAddress: true },
  });
  const fromAddress = sourceAddress || sender?.usdtAddress;
  if (!fromAddress) throw new Error("Adresse source TRON manquante");

  const privateKey = decrypt(encryptedPrivateKey).replace(/^0x/, "");
  const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
    privateKey,
  });
  if (!tronWeb.isAddress(fromAddress) || !tronWeb.isAddress(destination)) {
    throw new Error("Adresse TRON invalide");
  }

  const amountSun = BigInt(Math.round(Number(tx.amount) * 1_000_000));
  if (amountSun <= 0n) throw new Error("Montant TRX invalide");
  const result = await tronWeb.trx.sendTransaction(destination, amountSun.toString());
  if (!result?.result || !result.txid) {
    throw new Error("TRON n'a pas confirmé le transfert TRX");
  }
  return result.txid;
}

async function processExternalTransfers() {
  console.log(`[v0] [WORKER] Recherche des transactions en attente...`);
  
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

  console.log(`[v0] [WORKER] ${pendingTxs.length} transaction(s) trouvee(s)`);
  
  if (pendingTxs.length > 0) {
    console.log(`[v0] [WORKER] Transactions:`, pendingTxs.map(t => ({
      id: t.id,
      reference: t.reference,
      currency: t.currency,
      amount: t.amount,
      status: t.status,
      statusClass: t.statusClass,
      blockchainTx: t.blockchainTx,
      metadata: t.metadata
    })));
  }

  let count = 0;

  for (const tx of pendingTxs) {
    try {
      const metadata = tx.metadata as any;
      // L'adresse peut etre dans externalAddress ou destinationAddress ou accountNumber
      const destination = metadata?.externalAddress || metadata?.destinationAddress || tx.accountNumber;
      
      console.log(`[v0] [WORKER] Traitement TX ${tx.reference}:`, { destination, currency: tx.currency, amount: tx.amount });
      
      if (!destination) {
        console.log(`[v0] [WORKER] ERREUR: Pas d'adresse de destination pour ${tx.reference}`);
        throw new Error("Pas d'adresse de destination trouvee");
      }

      let hash = "";

      // Récupération de l'expéditeur pour avoir ses clés privées
      const sender = await prisma.user.findUnique({ where: { id: tx.fromUserId! } });
      if (!sender) throw new Error("Expéditeur introuvable");

      // --- ROUTAGE PAR CRYPTO (Basé sur votre Schéma Prisma) ---
      if (tx.currency === "TRX") {
        hash = await sendTRX(tx, destination, sender.usdtPrivateKey);
      }
      else if (tx.currency === "XRP") {
        hash = await sendXRP(tx, destination, sender.xrpPrivateKey);
      } 
      else if (tx.currency === "PI") {
        // Pi Network: utiliser le MASTER WALLET de PIMOBIPAY (les fonds sont centralisés)
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

      if (!hash) {
        throw new Error(`Aucun hash blockchain retourné pour ${tx.reference}`);
      }

      console.log(`[v0] [WORKER] TX ${tx.reference} ENVOYEE avec hash:`, hash);
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { 
            blockchainTx: hash,
            status: TransactionStatus.SUCCESS 
          }
        });
        console.log(`[v0] [WORKER] TX ${tx.reference} STATUS updated to SUCCESS with blockchain hash`);
        count++;
    } catch (err: any) {
      console.error(`[v0] [WORKER] ERREUR sur TX ${tx.reference}:`, err?.message || JSON.stringify(err));
      console.error(`[v0] [WORKER] Stack:`, err?.stack);
      // Marquer la transaction comme FAILED apres une erreur pour eviter les boucles infinies
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...(tx.metadata as any),
            workerError: err?.message || "Erreur inconnue",
            errorStack: err?.stack?.substring(0, 500) || "",
            failedAt: new Date().toISOString(),
          },
        },
      }).catch((e) => console.error("[v0] [WORKER] Erreur update FAILED:", e.message));
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
  const networkConfig = await getPiNetworkConfig();
  await verifyPiHorizonNetwork(networkConfig);
  const PI_MASTER_SECRET = networkConfig.masterSecret;
  const PI_MASTER_ADDRESS = networkConfig.masterAddress;
  const PI_API_KEY = networkConfig.apiKey;
  const metadata = tx.metadata as Record<string, unknown> | null;
  const transactionNetwork = metadata?.network;
  if (transactionNetwork && transactionNetwork !== networkConfig.network) {
    throw new Error("Le réseau de la transaction ne correspond plus au réseau Pi actif");
  }
  if (!PI_MASTER_SECRET || !PI_MASTER_ADDRESS) {
    throw new Error("Configuration du master wallet Pi indisponible pour le réseau actif");
  }
  const masterKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  if (masterKeypair.publicKey() !== PI_MASTER_ADDRESS) {
    throw new Error("La clé secrète Pi ne correspond pas à l'adresse master configurée");
  }

  const userPiUid = typeof metadata?.piUid === "string" ? metadata.piUid : null;
  const PI_API_URL = "https://api.minepi.com";

  console.log("[PI_A2U] Transfert Pi", {
    network: networkConfig.network,
    masterAddress: `${PI_MASTER_ADDRESS.substring(0, 10)}...`,
    destination: dest,
    userPiUid: userPiUid ? `${userPiUid.substring(0, 8)}...` : "N/A",
    amount: tx.amount,
  });

  if (userPiUid && PI_API_KEY) {
    return sendPiA2UOfficial(tx, userPiUid, PI_API_KEY, PI_API_URL, networkConfig);
  }
  return sendPiDirectTransfer(tx, dest, networkConfig);
}

// Flux A2U officiel via l'API Pi Network
async function sendPiA2UOfficial(
  tx: any,
  userUid: string,
  apiKey: string,
  apiUrl: string,
  networkConfig: Awaited<ReturnType<typeof getPiNetworkConfig>>
): Promise<string> {
  const PI_MASTER_SECRET = networkConfig.masterSecret!;
  const PI_MASTER_ADDRESS = networkConfig.masterAddress!;
  
  // Étape 1: Créer le paiement via l'API Pi
  console.log(`[v0] [PI_A2U] Étape 1: Création du paiement via API Pi...`);
  console.log(`[v0] [PI_A2U] Request:`, {
    url: `${apiUrl}/v2/payments`,
    userUid: userUid,
    amount: Number(tx.amount),
    apiKeyPresent: !!apiKey
  });
  
  const paymentBody = {
    amount: Number(tx.amount),
    memo: `PIMOBIPAY: ${tx.reference || 'Retrait'}`,
    metadata: { 
      transactionId: tx.id,
      reference: tx.reference,
      platform: "PIMOBIPAY",
      network: networkConfig.network,
    },
    uid: userUid
  };
  
  console.log(`[v0] [PI_A2U] Payment request prepared for network ${networkConfig.network}.`);
  
  const createPaymentResponse = await fetch(`${apiUrl}/v2/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(paymentBody)
  });
  
  console.log(`[v0] [PI_A2U] Response status:`, createPaymentResponse.status);
  
  if (!createPaymentResponse.ok) {
    const errorData = await createPaymentResponse.text();
    console.error(`[v0] [PI_A2U] Erreur création paiement:`, errorData);
    throw new Error(`Erreur API Pi (${createPaymentResponse.status}): ${errorData}`);
  }
  
  const paymentData = await createPaymentResponse.json();
  console.log(`[v0] [PI_A2U] Payment data received:`, JSON.stringify(paymentData));
  
  const paymentIdentifier = paymentData.identifier;
  const recipientAddress = paymentData.recipient;
  
  console.log(`[PI_A2U] Paiement créé:`, { 
    paymentIdentifier, 
    recipientAddress: recipientAddress?.substring(0, 10) + "..." 
  });
  
  // Étape 2: Charger le compte et construire la transaction
  console.log(`[PI_A2U] Étape 2: Construction de la transaction blockchain...`);
  
  const server = new StellarSdk.Horizon.Server(networkConfig.horizonUrl, {
    allowHttp: networkConfig.horizonUrl.includes("localhost")
  });

  const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
  
  // Récupérer les frais dynamiques du réseau avec multiplicateur de sécurité
  let dynamicFee: string;
  try {
    const baseFee = await server.fetchBaseFee();
    // Utiliser 3x les frais de base pour garantir la confirmation, minimum 5000 stroops
    dynamicFee = String(Math.max(baseFee * 3, 5000));
    console.log(`[PI_A2U] Frais dynamiques: ${dynamicFee} stroops (base: ${baseFee})`);
  } catch (feeError: any) {
    dynamicFee = "10000";
    console.log(`[PI_A2U] Fallback frais: ${dynamicFee} stroops`);
  }
  
  // Vérifier le solde
  const piBalance = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  if (!piBalance || parseFloat(piBalance.balance) < tx.amount) {
    throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI`);
  }
  
  // Étape 3: Construire la transaction avec le paymentIdentifier comme MEMO (obligatoire!)
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: dynamicFee,
    networkPassphrase: networkConfig.passphrase,
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
  
  let submitResult: any;
  try {
    submitResult = await server.submitTransaction(transaction);
  } catch (submitError: any) {
    // Stellar SDK peut throw une exception meme si la transaction est soumise
    console.error(`[PI_A2U] Erreur soumission:`, submitError.response?.data || submitError.message);
    
    if (submitError.response?.data?.extras?.result_codes) {
      const codes = submitError.response.data.extras.result_codes;
      if (codes.operations?.includes("op_no_destination")) {
        throw new Error("Le compte destinataire n'existe pas. L'utilisateur doit activer son wallet Pi.");
      }
      if (codes.operations?.includes("op_underfunded")) {
        throw new Error("Solde Master Wallet insuffisant.");
      }
      throw new Error(`Transaction echouee: ${JSON.stringify(codes)}`);
    }
    throw submitError;
  }
  
  if (!submitResult.successful) {
    throw new Error(`Transaction blockchain échouée: ${JSON.stringify(submitResult.extras?.result_codes)}`);
  }
  
  // Le txid peut etre dans .hash ou .id selon la version du SDK
  const txid = submitResult.hash || submitResult.id;
  console.log(`[PI_A2U] Transaction soumise avec succes:`, { 
    hash: submitResult.hash, 
    id: submitResult.id,
    txid 
  });
  
  // Étape 6: Compléter le paiement via l'API Pi
  console.log(`[PI_A2U] Étape 6: Complétion du paiement via API Pi...`);
  
  const completion = await completePiPayment(paymentIdentifier, txid, { retries: 2, delayMs: 1000 });
  if (!completion.ok) {
    console.error("[PI_A2U] La transaction est diffusée, mais la complétion Pi reste à réconcilier", {
      paymentIdentifier,
      txid,
      status: completion.status,
    });
  } else {
    console.log("[PI_A2U] Paiement complété avec succès");
  }
  
  return txid;
}

// Transfert direct vers une adresse wallet (fallback si pas d'UID Pi)
async function sendPiDirectTransfer(
  tx: any,
  dest: string,
  networkConfig: Awaited<ReturnType<typeof getPiNetworkConfig>>
): Promise<string> {
  const PI_MASTER_SECRET = networkConfig.masterSecret!;
  const PI_MASTER_ADDRESS = networkConfig.masterAddress!;
  
  console.log(`[v0] [PI_DIRECT] Demarrage transfert direct`);
  console.log(`[v0] [PI_DIRECT] Destination recue:`, { dest, type: typeof dest, length: dest?.length });
  console.log(`[v0] [PI_DIRECT] Config:`, {
    horizonUrl: networkConfig.horizonUrl,
    network: networkConfig.network,
    masterAddress: PI_MASTER_ADDRESS?.substring(0, 15) + "...",
    destination: dest?.substring(0, 15) + "...",
    amount: tx.amount,
    masterSecretPresent: !!PI_MASTER_SECRET
  });
  
  // Valider que destination est une adresse valide
  if (!dest || typeof dest !== 'string' || dest.trim().length === 0) {
    console.error(`[v0] [PI_DIRECT] Destination vide ou invalide:`, dest);
    throw new Error(`Adresse de destination invalide: ${dest}`);
  }
  
  const cleanDest = dest.trim();
  
  // Valider l'adresse de destination (format Stellar Ed25519)
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(cleanDest)) {
    console.error(`[v0] [PI_DIRECT] Adresse invalide (pas du format Stellar):`, cleanDest);
    console.error(`[v0] [PI_DIRECT] Details:`, {
      input: cleanDest,
      startsWithG: cleanDest.startsWith('G'),
      length: cleanDest.length,
      expectedLength: 56
    });
    throw new Error(`Adresse Pi invalide (format Stellar attendu): ${cleanDest}`);
  }
  
  const server = new StellarSdk.Horizon.Server(networkConfig.horizonUrl, {
    allowHttp: networkConfig.horizonUrl.includes("localhost")
  });

  // Charger le compte master
  console.log(`[v0] [PI_DIRECT] Chargement du compte master...`);
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
    console.log(`[v0] [PI_DIRECT] Compte master charge, sequence: ${sourceAccount.sequenceNumber()}`);
  } catch (loadError: any) {
    console.error(`[v0] [PI_DIRECT] Erreur chargement compte:`, loadError.message);
    if (loadError.response?.status === 404) {
      throw new Error(`Le compte master ${PI_MASTER_ADDRESS} n'existe pas sur ${networkConfig.horizonUrl}. Vérifiez le réseau Pi configuré.`);
    }
    throw loadError;
  }
  
  // Vérifier le solde
  const piBalance = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  console.log(`[v0] [PI_DIRECT] Solde master:`, piBalance?.balance || "0");
  
  if (!piBalance || parseFloat(piBalance.balance) < tx.amount) {
    throw new Error(`Solde Master Wallet insuffisant. Disponible: ${piBalance?.balance || 0} PI, Requis: ${tx.amount} PI`);
  }
  
  // Récupérer les frais dynamiques du réseau
  let dynamicFee: string;
  try {
    const baseFee = await server.fetchBaseFee();
    dynamicFee = String(Math.max(baseFee * 3, 5000));
    console.log(`[v0] [PI_DIRECT] Frais dynamiques: ${dynamicFee} stroops (base: ${baseFee})`);
  } catch (feeError: any) {
    dynamicFee = "10000";
    console.log(`[v0] [PI_DIRECT] Fallback frais: ${dynamicFee} stroops`);
  }

  // Construire la transaction
  console.log(`[v0] [PI_DIRECT] Construction de la transaction...`);
  console.log(`[v0] [PI_DIRECT] Details transaction:`, {
    destination: cleanDest,
    amount: tx.amount.toFixed(7),
    currency: tx.currency,
    reference: tx.reference
  });
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: dynamicFee,
    networkPassphrase: networkConfig.passphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: cleanDest,
        asset: StellarSdk.Asset.native(),
        amount: tx.amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(tx.reference?.substring(0, 28) || "PIMOBIPAY"))
    .setTimeout(180)
    .build();
  
  // Signer avec la clé secrète du master wallet
  console.log(`[v0] [PI_DIRECT] Signature de la transaction...`);
  const sourceKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  transaction.sign(sourceKeypair);
  
  // Soumettre
  console.log(`[v0] [PI_DIRECT] Soumission de la transaction...`);
  let result: any;
  try {
    result = await server.submitTransaction(transaction);
    console.log(`[v0] [PI_DIRECT] Resultat:`, JSON.stringify(result));
  } catch (submitError: any) {
    console.error(`[v0] [PI_DIRECT] Erreur soumission:`, submitError.response?.data || submitError.message);
    
    const codes = submitError.response?.data?.extras?.result_codes;
    if (codes) {
      console.error(`[v0] [PI_DIRECT] Codes erreur:`, codes);
      if (codes.operations?.includes("op_no_destination")) {
        throw new Error("Le compte destinataire n'existe pas sur Pi Network. L'utilisateur doit d'abord activer son wallet Pi.");
      }
      if (codes.operations?.includes("op_underfunded")) {
        throw new Error("Solde Master Wallet insuffisant.");
      }
    }
    throw new Error(`Transaction echouee: ${submitError.message}`);
  }
  
  if (!result.successful) {
    const codes = result.extras?.result_codes;
    console.error(`[v0] [PI_DIRECT] Transaction non reussie:`, codes);
    throw new Error(`Transaction echouee: ${JSON.stringify(codes || result)}`);
  }
  
  console.log(`[v0] [PI_DIRECT] Transaction soumise avec succes: ${result.hash}`);
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
  const piConfig = isPi ? await getPiNetworkConfig() : null;
  if (piConfig) await verifyPiHorizonNetwork(piConfig);
  const transactionNetwork = (tx.metadata as Record<string, unknown> | null)?.network;
  if (piConfig && transactionNetwork && transactionNetwork !== piConfig.network) {
    throw new Error("Le réseau de la transaction ne correspond plus au réseau Pi actif");
  }
  const url = piConfig?.horizonUrl ?? RPC_URLS.XLM;
  const networkPassphrase = piConfig?.passphrase ?? StellarSdk.Networks.PUBLIC;
  
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
    .addMemo(StellarSdk.Memo.text(tx.reference?.substring(0, 28) || "PIMOBIPAY"))
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
  // Fix: Convert amount to fixed-point string to avoid scientific notation (e.g. 1e-8)
  const amountStr = Number(tx.amount).toFixed(18).replace(/\.?0+$/, '');
  const response = await wallet.sendTransaction({
    to: dest,
    value: ethers.parseEther(amountStr)
  });

  // ⚠️ CORRECTIF anti double-débit on-chain (SDA, USDT, BNB/ETH) :
  // Dès que sendTransaction() retourne, la transaction est DÉJÀ diffusée sur la
  // blockchain (les fonds on-chain sont engagés). On retourne donc le hash
  // IMMÉDIATEMENT. Si l'attente de confirmation échoue ensuite (timeout RPC,
  // coupure réseau...), on NE doit PAS propager l'erreur : sinon l'appelant
  // marquerait la transaction FAILED et rembourserait l'utilisateur alors que
  // les fonds on-chain ont bel et bien été dépensés (solde intact / on-chain consommé).
  try {
    const receipt = await response.wait();
    return receipt?.hash || response.hash;
  } catch (waitErr: any) {
    console.warn(
      `[WORKER] ${tx.currency} diffusée mais confirmation non lue (${waitErr?.message}). Hash conservé: ${response.hash}`
    );
    return response.hash;
  }
}
