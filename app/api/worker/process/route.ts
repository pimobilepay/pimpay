export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto'; // Assurez-vous que cette fonction existe
import * as xrpl from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ethers } from 'ethers'; // Pour Sidra et USDT
import { TransactionStatus } from "@prisma/client";

// Configuration des accès réseaux
const RPC_URLS = {
  XRP: "wss://s2.ripple.com",
  XLM: "https://horizon.stellar.org",
  PI: "https://api.mainnet.minepi.com",
  SIDRA: "https://node.sidrachain.com", // À ajuster selon le RPC officiel Sidra
  EVM_DEFAULT: "https://bsc-dataseed.binance.org" // Pour USDT si sur BSC
};

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
  // On récupère les transactions PENDING marquées isExternal
  const pendingTxs = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.PENDING,
      metadata: { path: ['isExternal'], equals: true }
    },
    take: 10
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
      else if (tx.currency === "PI" || tx.currency === "XLM") {
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
    } catch (err) {
      console.error(`Erreur sur TX ${tx.reference}:`, err);
    }
  }
  return count;
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
  const url = tx.currency === "PI" ? RPC_URLS.PI : RPC_URLS.XLM;
  const server = new StellarSdk.Horizon.Server(url);
  const keys = StellarSdk.Keypair.fromSecret(decrypt(encryptedKey));
  const account = await server.loadAccount(keys.publicKey());
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: tx.currency === "PI" ? "Pi Network" : StellarSdk.Networks.PUBLIC
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: dest,
      asset: StellarSdk.Asset.native(),
      amount: tx.amount.toString()
    }))
    .setTimeout(30).build();
  transaction.sign(keys);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

// --- LOGIQUE EVM (Sidra, USDT) ---
async function sendEVM(tx: any, dest: string, encryptedKey: string | null, rpc: string) {
  if (!encryptedKey) throw new Error(`Clé ${tx.currency} manquante`);
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(decrypt(encryptedKey), provider);
  
  // Envoi de la monnaie native (SDA ou BNB/ETH selon le réseau)
  const response = await wallet.sendTransaction({
    to: dest,
    value: ethers.parseEther(tx.amount.toString())
  });
  return response.hash;
}
