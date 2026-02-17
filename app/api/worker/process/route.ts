// Directive pour empêcher la mise en cache et forcer l'exécution à chaque appel
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import * as xrpl from 'xrpl';
import * as StellarSdk from '@stellar/stellar-sdk'; // Mise à jour du SDK
import { TransactionStatus } from "@prisma/client";

// Configuration des serveurs (Mainnets)
const XRP_SERVER = "wss://s2.ripple.com";
const XLM_SERVER = "https://horizon.stellar.org";
const PI_SERVER = "https://api.mainnet.minepi.com";

export async function GET(req: NextRequest) {
  try {
    const result = await processExternalTransfers();
    return NextResponse.json({ success: true, processed: result });
  } catch (error: any) {
    console.error("Erreur Worker:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function processExternalTransfers() {
  // Récupérer les transactions marquées pour envoi externe
  const pendingTxs = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.SUCCESS,
      blockchainTx: { contains: '-EXT-' }
    },
    take: 10
  });

  let count = 0;
  for (const tx of pendingTxs) {
    try {
      if (tx.currency === "XRP") {
        await sendXRP(tx);
        count++;
      } else if (tx.currency === "XLM" || tx.currency === "PI") {
        await sendStellarAsset(tx);
        count++;
      }
    } catch (error) {
      console.error(`Échec pour la transaction ${tx.id}:`, error);
    }
  }
  return count;
}

// --- LOGIQUE XRP ---
async function sendXRP(tx: any) {
  const sender = await prisma.user.findUnique({ where: { id: tx.fromUserId } });
  if (!sender?.xrpPrivateKey) throw new Error("Clé XRP manquante");

  const decryptedKey = decrypt(sender.xrpPrivateKey);
  const client = new xrpl.Client(XRP_SERVER);
  
  try {
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(decryptedKey);
    const destination = tx.description.split("vers ")[1]?.trim();

    if (!destination) throw new Error("Destination XRP introuvable");

    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Amount: xrpl.xrpToDrops(tx.amount.toString()),
      Destination: destination
    });

    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if ((result.result.meta as any).TransactionResult === "tesSUCCESS") {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { blockchainTx: result.result.hash }
      });
    }
  } finally {
    await client.disconnect();
  }
}

// --- LOGIQUE XLM / PI AVEC LE NOUVEAU SDK ---
async function sendStellarAsset(tx: any) {
  const sender = await prisma.user.findUnique({ where: { id: tx.fromUserId } });
  if (!sender?.stellarPrivateKey) throw new Error("Clé Stellar/Pi manquante");

  const decryptedKey = decrypt(sender.stellarPrivateKey);
  const serverUrl = tx.currency === "PI" ? PI_SERVER : XLM_SERVER;
  
  // Utilisation de la nouvelle classe Horizon.Server du SDK @stellar
  const server = new StellarSdk.Horizon.Server(serverUrl);

  const sourceKeys = StellarSdk.Keypair.fromSecret(decryptedKey);
  const account = await server.loadAccount(sourceKeys.publicKey());

  const destination = tx.description.split("vers ")[1]?.trim();
  if (!destination) throw new Error("Destination Stellar/Pi introuvable");

  // Configuration de la passphrase réseau
  const networkPassphrase = tx.currency === "PI" 
    ? "Pi Network" 
    : StellarSdk.Networks.PUBLIC;

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: destination,
      asset: StellarSdk.Asset.native(),
      amount: tx.amount.toString(),
    }))
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeys);
  const result = await server.submitTransaction(transaction);

  if (result.hash) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { blockchainTx: result.hash }
    });
  }
}
