import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth"; // Assure-toi que ton helper auth retourne bien l'ID
import { prisma } from "@/lib/prisma";
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Récupération de la clé de chiffrement depuis le .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";

/**
 * Chiffre la clé privée en AES-256-GCM
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Simule la génération d'une paire de clés XRP
 * Note : En production, il est préférable d'utiliser la lib 'xrpl' (xrpl.Wallet.generate())
 */
function generateXrpKeypair() {
  const seed = crypto.randomBytes(16);
  const alphabet = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  const hash = crypto.createHash('sha256').update(seed).digest();
  const ripemd = crypto.createHash('ripemd160').update(hash).digest();

  let address = 'r';
  for (let i = 0; i < 24; i++) {
    address += alphabet[ripemd[i % ripemd.length] % alphabet.length];
  }

  let secret = 's';
  for (let i = 0; i < 28; i++) {
    secret += alphabet[seed[i % seed.length] % alphabet.length];
  }

  return { address, secret };
}

// POST: Générer ou récupérer l'adresse XRP de l'utilisateur
export async function POST() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = userSession.id;

    // 1. Vérifier si l'utilisateur a déjà une adresse dans la table User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xrpAddress: true }
    });

    if (user?.xrpAddress) {
      return NextResponse.json({ address: user.xrpAddress, symbol: "XRP" });
    }

    // 2. Générer une nouvelle paire de clés
    const { address, secret } = generateXrpKeypair();
    const encryptedSecret = encrypt(secret);

    // 3. Sauvegarde atomique (Transaction)
    await prisma.$transaction(async (tx) => {
      // Mise à jour de l'utilisateur avec la nouvelle adresse et clé chiffrée
      await tx.user.update({
        where: { id: userId },
        data: { 
          xrpAddress: address, 
          xrpPrivateKey: encryptedSecret // NOM CORRIGÉ selon ton schéma
        }
      });

      // Création ou mise à jour du Wallet XRP
      await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "XRP" } },
        update: { depositMemo: address, type: "CRYPTO" },
        create: {
          userId,
          currency: "XRP",
          type: "CRYPTO",
          balance: 0,
          depositMemo: address,
        }
      });
    });

    return NextResponse.json({ address, symbol: "XRP" });
  } catch (error: any) {
    console.error("[XRP_GEN_ERROR]:", error);
    return NextResponse.json({ error: "Échec de génération", details: error.message }, { status: 500 });
  }
}

// GET: Récupérer le solde XRP depuis le Ledger
export async function GET() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = userSession.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xrpAddress: true }
    });

    if (!user?.xrpAddress) {
      return NextResponse.json({ balance: "0.000000", address: null });
    }

    let xrpBalance = 0;
    try {
      // Appel au nœud public Ripple
      const response = await fetch('https://s1.ripple.com:51234/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: user.xrpAddress, ledger_index: 'validated' }]
        }),
        next: { revalidate: 60 } // Cache d'une minute
      });

      const data = await response.json();
      if (data.result?.account_data?.Balance) {
        // Conversion Drops -> XRP
        xrpBalance = parseInt(data.result.account_data.Balance) / 1_000_000;
      }
    } catch (err) {
      console.warn("XRPL Node injoignable, lecture solde DB.");
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "XRP" } }
      });
      xrpBalance = wallet?.balance || 0;
    }

    // Synchronisation du solde dans la base de données
    await prisma.wallet.update({
      where: { userId_currency: { userId, currency: "XRP" } },
      data: { balance: xrpBalance }
    });

    return NextResponse.json({ 
      balance: xrpBalance.toFixed(6), 
      address: user.xrpAddress 
    });

  } catch (error: any) {
    console.error("[XRP_BALANCE_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
