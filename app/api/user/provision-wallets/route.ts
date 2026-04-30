import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from 'node:crypto';
import * as StellarSdk from '@stellar/stellar-sdk';

export const dynamic = 'force-dynamic';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";

// --- HELPERS DE SÉCURITÉ ---
function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

// --- GÉNÉRATEURS ---
// XRP: Génération simplifiée (pour demo - en production utiliser xrpl library)
function createXrpKeys() {
  const seed = crypto.randomBytes(16);
  const alphabet = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  const hash = crypto.createHash('ripemd160').update(crypto.createHash('sha256').update(seed).digest()).digest();
  
  let addr = 'r';
  for (let i = 0; i < 24; i++) addr += alphabet[hash[i % hash.length] % alphabet.length];
  let sec = 's';
  for (let i = 0; i < 28; i++) sec += alphabet[seed[i % seed.length] % alphabet.length];
  
  return { addr, sec };
}

// Stellar/XLM: Utilisation du SDK officiel pour générer des clés valides
function createStellarKeys() {
  const keypair = StellarSdk.Keypair.random();
  return {
    pub: keypair.publicKey(),  // Commence par G, 56 caractères
    priv: keypair.secret()     // Commence par S, 56 caractères
  };
}

// --- LOGIQUE PRINCIPALE ---
export async function POST() {
  try {
    const session = await auth();
    if (!session?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.id;

    // 1. Génération des paires de clés
    const xrp = createXrpKeys();
    const stellar = createStellarKeys();

    // 2. Chiffrement des clés privées
    const encXrp = encrypt(xrp.sec);
    const encStellar = encrypt(stellar.priv);

    // 3. Mise à jour massive via Transaction Prisma
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le profil utilisateur avec les adresses et clés
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xrpAddress: xrp.addr,
          xrpPrivateKey: encXrp,
          xlmAddress: stellar.pub,
          stellarPrivateKey: encStellar
        }
      });

      // Créer les wallets associés (XRP, XLM, et le wallet FIAT XAF par défaut)
      const currencies = [
        { code: "XRP", addr: xrp.addr, type: "CRYPTO" },
        { code: "XLM", addr: stellar.pub, type: "CRYPTO" },
        { code: "XAF", addr: null, type: "FIAT" }
      ];

      for (const curr of currencies) {
        await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: curr.code } },
          update: {},
          create: {
            userId,
            currency: curr.code,
            type: curr.type as any,
            depositMemo: curr.addr,
            balance: 0
          }
        });
      }

      return updatedUser;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      wallets: [
        { currency: "XRP", address: xrp.addr },
        { currency: "XLM", address: stellar.pub }
      ]
    });

  } catch (error: unknown) {
    console.error("[PROVISIONING_ERROR]:", error);
    return NextResponse.json({ error: "Erreur lors de la création des wallets" }, { status: 500 });
  }
}
