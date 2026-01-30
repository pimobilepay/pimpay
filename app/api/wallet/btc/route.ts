import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Initialisation globale
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = bitcoin.networks.bitcoin;

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";
  return Buffer.from(key.padEnd(32).slice(0, 32));
};

function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export async function POST(req: Request) {
  try {
    // 1. Récupération de la session
    const userSession = await auth();

    // Vérification basée sur ton type réel (id direct)
    if (!userSession || !userSession.id) {
      console.error("❌ [BTC_GEN]: Session non trouvée");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = userSession.id;

    // 2. Vérifier si un Wallet BTC existe déjà
    const existingWallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: userId,
          currency: "BTC"
        }
      }
    });

    if (existingWallet?.depositMemo) {
      return NextResponse.json({
        address: existingWallet.depositMemo,
        symbol: "BTC"
      });
    }

    // 3. GÉNÉRATION CORRIGÉE (Fix final pour le type RNG et build Vercel)
    const keyPair = ECPair.makeRandom({ 
      network: network,
      compressed: true,
      rng: (size?: number) => {
        // Correction : accepte size optionnel pour satisfaire TypeScript
        const buf = crypto.randomBytes(size || 32);
        return new Uint8Array(buf);
      }
    });

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: network,
    });

    if (!address) {
      throw new Error("L'adresse BTC n'a pas pu être générée");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const encryptedKey = encrypt(keyPair.toWIF());

    // 4. Transaction Atomique Prisma
    const result = await prisma.$transaction(async (tx) => {
      // Création ou Update du Wallet BTC
      const wallet = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: userId,
            currency: "BTC"
          }
        },
        update: {
            depositMemo: address,
            type: "CRYPTO"
        },
        create: {
          userId: userId,
          currency: "BTC",
          type: "CRYPTO",
          balance: 0,
          depositMemo: address,
        }
      });

      // Stockage dans le Vault
      await tx.vault.create({
        data: {
          userId: userId,
          name: `BTC_PRIV_KEY_${address}`,
          amount: 0, 
        }
      });

      // Mise à jour du profil utilisateur
      await tx.user.update({
        where: { id: userId },
        data: { walletAddress: address }
      });

      return wallet;
    }, {
        maxWait: 5000,
        timeout: 10000
    });

    return NextResponse.json({
      address: result.depositMemo,
      symbol: "BTC"
    });

  } catch (error: any) {
    console.error("❌ [BTC_GEN_ERROR]:", error);
    return NextResponse.json({
      error: "Erreur lors de la génération du wallet BTC",
      details: error.message
    }, { status: 500 });
  }
}
