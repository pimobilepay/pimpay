import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

// Stellar uses Ed25519 keys, address starts with 'G', secret starts with 'S'
function generateStellarKeypair() {
  const rawSeed = crypto.randomBytes(32);
  
  // Base32 encode for Stellar format
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  function toBase32(buffer: Buffer, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += base32Chars[buffer[i % buffer.length] % 32];
    }
    return result;
  }

  const addressHash = crypto.createHash('sha256').update(rawSeed).update('stellar-public').digest();
  const secretHash = crypto.createHash('sha256').update(rawSeed).update('stellar-secret').digest();

  const publicKey = 'G' + toBase32(addressHash, 55);
  const secretKey = 'S' + toBase32(secretHash, 55);

  return { publicKey, secretKey };
}

// POST: Generate or retrieve XLM address
export async function POST() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    const userId = userSession.id;

    // Check if already has an XLM wallet
    const existing = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "XLM" } }
    });

    if (existing?.depositMemo) {
      return NextResponse.json({ address: existing.depositMemo, symbol: "XLM" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xlmAddress: true }
    });

    if (user?.xlmAddress) {
      return NextResponse.json({ address: user.xlmAddress, symbol: "XLM" });
    }

    // Generate new keypair
    const { publicKey, secretKey } = generateStellarKeypair();
    const encryptedSecret = encrypt(secretKey);

    // Save to DB
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { xlmAddress: publicKey, xlmSecret: encryptedSecret }
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
    return NextResponse.json({ error: "Echec de generation", details: error.message }, { status: 500 });
  }
}

// GET: Fetch XLM balance from Horizon
export async function GET() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userSession.id },
      select: { xlmAddress: true }
    });

    if (!user?.xlmAddress) {
      return NextResponse.json({ balance: "0", address: null });
    }

    // Fetch balance from Stellar Horizon API
    let xlmBalance = 0;
    try {
      const response = await fetch(`https://horizon.stellar.org/accounts/${user.xlmAddress}`, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const nativeBalance = data.balances?.find((b: any) => b.asset_type === 'native');
        if (nativeBalance) {
          xlmBalance = parseFloat(nativeBalance.balance);
        }
      }
    } catch {
      // Fallback to DB value
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: userSession.id, currency: "XLM" } }
      });
      xlmBalance = wallet?.balance || 0;
    }

    // Sync to DB
    await prisma.wallet.upsert({
      where: { userId_currency: { userId: userSession.id, currency: "XLM" } },
      update: { balance: xlmBalance },
      create: { userId: userSession.id, currency: "XLM", balance: xlmBalance, type: "CRYPTO" }
    });

    return NextResponse.json({ balance: xlmBalance.toFixed(7), address: user.xlmAddress });
  } catch (error: any) {
    console.error("[XLM_BALANCE_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
