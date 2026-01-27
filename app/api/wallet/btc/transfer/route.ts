import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ECPair = ECPairFactory(tinysecp);
const network = bitcoin.networks.bitcoin;

// Utilitaire pour récupérer les frais recommandés du réseau
async function getDynamicFees() {
  try {
    const res = await fetch('https://mempool.space/api/v1/fees/recommended');
    const fees = await res.json();
    // On prend la priorité haute (fastestFee) pour garantir une transaction PimPay rapide
    // Ou la priorité moyenne (hourFee) pour économiser
    return fees;
  } catch (e) {
    // Valeurs de secours (fallback) si l'API est down
    return { fastestFee: 25, halfHourFee: 20, hourFee: 15 };
  }
}

const ALGORITHM = 'aes-256-gcm';
const KEY_STRING = process.env.ENCRYPTION_KEY || '';
const KEY = Buffer.from(KEY_STRING.padEnd(32).slice(0, 32), 'utf8');

function decrypt(encryptedData: string) {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { toAddress, amountInSatoshi, priority = "fastestFee" } = await req.json();

    // 1. Récupérer Wallet & Clé
    const userWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId: session.id, currency: "BTC" } }
    });
    const vault = await prisma.vault.findFirst({
      where: { userId: session.id, name: { startsWith: "BTC_SECRET:" } },
      orderBy: { createdAt: 'desc' }
    });

    if (!userWallet?.depositMemo || !vault) throw new Error("Wallet non configuré");

    const privateKeyWIF = decrypt(vault.name.split("BTC_SECRET:")[1]);
    const keyPair = ECPair.fromWIF(privateKeyWIF, network);

    // 2. Récupérer UTXOs et Frais dynamiques
    const [utxos, networkFees] = await Promise.all([
      fetch(`https://mempool.space/api/address/${userWallet.depositMemo}/utxo`).then(r => r.json()),
      getDynamicFees()
    ]);

    if (!utxos.length) throw new Error("Aucun fonds disponibles");

    // 3. Calculer la taille estimée (vBytes) pour les frais
    // Formule simplifiée pour SegWit: (inputs * 68) + (outputs * 31) + 10
    const feeRate = networkFees[priority] || networkFees.fastestFee;
    const estimatedSize = (utxos.length * 68) + (2 * 31) + 10;
    const dynamicFee = Math.ceil(estimatedSize * feeRate);

    // 4. Construction de la transaction
    const psbt = new bitcoin.Psbt({ network });
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
    let totalInput = 0;

    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { script: p2wpkh.output!, value: BigInt(utxo.value) },
      });
      totalInput += utxo.value;
    }

    const change = totalInput - Number(amountInSatoshi) - dynamicFee;
    if (change < 0) throw new Error(`Solde insuffisant (Frais requis: ${dynamicFee} sats)`);

    psbt.addOutput({ address: toAddress, value: BigInt(amountInSatoshi) });
    if (change > 546) {
      psbt.addOutput({ address: userWallet.depositMemo, value: BigInt(change) });
    }

    // 5. Signature et Diffusion
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();
    const rawTx = psbt.extractTransaction().toHex();

    const broadcast = await fetch(`https://mempool.space/api/tx`, { method: 'POST', body: rawTx });
    const txid = await broadcast.text();

    if (!broadcast.ok) throw new Error("Erreur diffusion: " + txid);

    return NextResponse.json({ success: true, txid, fee: dynamicFee });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
