import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Initialisation ECPair
const ECPair = ECPairFactory(tinysecp);
const network = bitcoin.networks.bitcoin;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "votre-cle-de-32-caracteres-min!!";

/**
 * Chiffre la clé WIF pour stockage sécurisé dans PimPay
 */
function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export async function POST(req: Request) {
  try {
    const userSession = await auth();

    if (!userSession?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Recherche du wallet BTC existant (Utilisation de l'index unique userId_currency)
    const btcWallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: userSession.id,
          currency: "BTC"
        }
      }
    });

    // 2. Si adresse valide bc1 (SegWit), on la retourne
    if (btcWallet?.depositMemo && btcWallet.depositMemo.startsWith("bc1")) {
      return NextResponse.json({
        address: btcWallet.depositMemo,
        symbol: "BTC"
      });
    }

    // 3. Génération d'une nouvelle adresse SegWit (Types fixés pour le build)
    const keyPair = ECPair.makeRandom({
      network: network,
      compressed: true,
      rng: (size: number = 32) => new Uint8Array(crypto.randomBytes(size))
    });

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });

    if (!address) throw new Error("Erreur génération adresse");

    const encryptedKey = encrypt(keyPair.toWIF());

    // 4. Enregistrement Wallet & Vault
    // Note: Comme ton schéma Vault n'a pas d'index unique composé, 
    // on utilise une approche sécurisée en deux étapes.
    const updatedWallet = await prisma.$transaction(async (tx) => {
      // Mise à jour ou création du Wallet
      const w = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: userSession.id,
            currency: "BTC"
          }
        },
        update: { depositMemo: address, type: "CRYPTO" },
        create: {
          userId: userSession.id,
          currency: "BTC",
          type: "CRYPTO",
          balance: 0,
          depositMemo: address,
        }
      });

      // Stockage de la clé privée chiffrée dans le Vault PimPay
      // On utilise le champ "name" pour stocker la clé (le champ "value" n'existe pas dans ton schéma)
      // J'utilise le champ "name" de ton modèle Vault pour stocker la clé cryptée.
      await tx.vault.create({
        data: {
          userId: userSession.id,
          name: `BTC_SECRET:${address}:${encryptedKey}`, // Stockage compact
          amount: 0,
        }
      });

      return w;
    });

    return NextResponse.json({
      address: updatedWallet.depositMemo,
      symbol: "BTC"
    });

  } catch (error: any) {
    console.error("❌ [BTC_API_ERROR]:", error.message);
    return NextResponse.json({
      error: "Erreur lors de l'opération",
      details: error.message
    }, { status: 500 });
  }
}
