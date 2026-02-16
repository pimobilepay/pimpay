import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@noble/secp256k1';
import crypto from 'node:crypto';
import bs58 from 'bs58'; // Utilise le package bs58 que tu as déjà

export const dynamic = 'force-dynamic';

// Fonction manuelle pour créer le WIF sans bs58check
function bytesToWif(privKey: Buffer): string {
  // 1. Préfixe 0x80 pour le Mainnet + Clé privée + 0x01 pour compressé
  const payload = Buffer.concat([Buffer.from([0x80]), privKey, Buffer.from([0x01])]);
  
  // 2. Double SHA256 pour le Checksum
  const hash1 = crypto.createHash('sha256').update(payload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  
  // 3. Concaténer et encoder en Base58
  return bs58.encode(Buffer.concat([payload, checksum]));
}

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from((process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars").padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
};

export async function POST(req: Request) {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = userSession.id;

    const existing = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "BTC" } }
    });
    if (existing?.depositMemo) return NextResponse.json({ address: existing.depositMemo, symbol: "BTC" });

    // GÉNÉRATION
    const privKeyBytes = crypto.randomBytes(32);
    const pubKey = Buffer.from(ecc.getPublicKey(privKeyBytes, true));

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: bitcoin.networks.bitcoin,
    });

    if (!address) throw new Error("Erreur adresse");

    const wif = bytesToWif(privKeyBytes);
    const encryptedKey = encrypt(wif);

    // SAUVEGARDE - On ne touche PAS à user.walletAddress (réservé à Pi)
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "BTC" } },
        update: { depositMemo: address, type: "CRYPTO" },
        create: {
          userId,
          currency: "BTC",
          type: "CRYPTO",
          balance: 0,
          depositMemo: address,
        }
      });

      await tx.vault.create({
        data: { userId, name: `BTC_PRIV_${address}`, amount: 0 }
      });

      return wallet;
    });

    return NextResponse.json({ address: result.depositMemo, symbol: "BTC" });

  } catch (error: any) {
    console.error("❌ [BTC_GEN_ERROR]:", error);
    return NextResponse.json({ error: "Échec", details: error.message }, { status: 500 });
  }
}
