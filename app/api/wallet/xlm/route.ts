import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from 'node:crypto';
import * as StellarSdk from '@stellar/stellar-sdk'; // Utilisation du nouveau SDK

export const dynamic = 'force-dynamic';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";

/**
 * Chiffre la clé privée avec AES-256-GCM (Standard PimPay)
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

// POST: Générer ou récupérer l'adresse XLM/PI
export async function POST() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = userSession.id;

    // 1. Vérification existence
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xlmAddress: true }
    });

    if (user?.xlmAddress) {
      return NextResponse.json({ address: user.xlmAddress, symbol: "XLM" });
    }

    // 2. Génération via le SDK @stellar/stellar-sdk (Beaucoup plus sûr)
    const pair = StellarSdk.Keypair.random();
    const publicKey = pair.publicKey();
    const secretKey = pair.secret();
    
    const encryptedSecret = encrypt(secretKey);

    // 3. Transaction atomique Prisma
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          xlmAddress: publicKey,
          stellarPrivateKey: encryptedSecret // Nom conforme à ton schéma
        }
      });

      await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "XLM" } },
        update: { depositMemo: publicKey, type: "CRYPTO" },
        create: {
          userId,
          currency: "XLM",
          type: "CRYPTO",
          balance: 0,
          depositMemo: publicKey,
        }
      });
    });

    return NextResponse.json({ address: publicKey, symbol: "XLM" });
  } catch (error: any) {
    console.error("[XLM_GEN_ERROR]:", error);
    return NextResponse.json({ error: "Échec de génération XLM", details: error.message }, { status: 500 });
  }
}

// GET: Récupérer le solde depuis Horizon
export async function GET() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = userSession.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xlmAddress: true }
    });

    if (!user?.xlmAddress) {
      return NextResponse.json({ balance: "0.0000000", address: null });
    }

    let xlmBalance = 0;
    try {
      // Utilisation de la classe Horizon du nouveau SDK
      const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
      const account = await server.loadAccount(user.xlmAddress);
      
      const nativeBalance = account.balances.find(b => b.asset_type === 'native');
      if (nativeBalance) {
        xlmBalance = parseFloat(nativeBalance.balance);
      }
    } catch (err) {
      console.warn("Horizon injoignable ou compte non créé sur la blockchain.");
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XLM" } }
      });
      xlmBalance = wallet?.balance || 0;
    }

    // Mise à jour synchrone du solde DB
    await prisma.wallet.update({
      where: { userId_currency: { userId, currency: "XLM" } },
      data: { balance: xlmBalance }
    });

    return NextResponse.json({
      balance: xlmBalance.toFixed(7),
      address: user.xlmAddress
    });

  } catch (error: any) {
    console.error("[XLM_BALANCE_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur XLM" }, { status: 500 });
  }
}
