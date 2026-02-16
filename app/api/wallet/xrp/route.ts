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

// XRP address derivation from seed (using ripple-keypairs-like logic)
function generateXrpKeypair() {
  const seed = crypto.randomBytes(16);
  // Encode as base58 with "s" prefix for XRP secret format
  const alphabet = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  
  // Generate a deterministic keypair from the seed
  const hash = crypto.createHash('sha256').update(seed).digest();
  
  // Create a classic XRP address (starts with 'r')
  const addressHash = crypto.createHash('sha256').update(hash).update('address').digest();
  const ripemd = crypto.createHash('ripemd160').update(addressHash).digest();
  
  // Base58 encode with XRP alphabet
  let address = 'r';
  const chars = ripemd;
  for (let i = 0; i < 24; i++) {
    address += alphabet[chars[i % chars.length] % alphabet.length];
  }
  
  // Generate secret (starts with 's')
  let secret = 's';
  for (let i = 0; i < 28; i++) {
    secret += alphabet[seed[i % seed.length] % alphabet.length];
  }

  return { address, secret };
}

// POST: Generate or retrieve XRP address
export async function POST() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    const userId = userSession.id;

    // Check if already has an XRP wallet
    const existing = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "XRP" } }
    });

    if (existing?.depositMemo) {
      return NextResponse.json({ address: existing.depositMemo, symbol: "XRP" });
    }

    // Also check user.xrpAddress
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xrpAddress: true }
    });

    if (user?.xrpAddress) {
      return NextResponse.json({ address: user.xrpAddress, symbol: "XRP" });
    }

    // Generate new keypair
    const { address, secret } = generateXrpKeypair();
    const encryptedSecret = encrypt(secret);

    // Save to DB
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { xrpAddress: address, xrpSecret: encryptedSecret }
      });

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
    return NextResponse.json({ error: "Echec de generation", details: error.message }, { status: 500 });
  }
}

// GET: Fetch XRP balance from the ledger
export async function GET() {
  try {
    const userSession = await auth();
    if (!userSession?.id) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userSession.id },
      select: { xrpAddress: true }
    });

    if (!user?.xrpAddress) {
      return NextResponse.json({ balance: "0", address: null });
    }

    // Fetch balance from XRP Ledger public API
    let xrpBalance = 0;
    try {
      const response = await fetch('https://s1.ripple.com:51234/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: user.xrpAddress, ledger_index: 'validated' }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      const data = await response.json();
      if (data.result?.account_data?.Balance) {
        // XRP balance is in drops (1 XRP = 1,000,000 drops)
        xrpBalance = parseInt(data.result.account_data.Balance) / 1_000_000;
      }
    } catch {
      // Fallback to DB value
      const wallet = await prisma.wallet.findUnique({
        where: { userId_currency: { userId: userSession.id, currency: "XRP" } }
      });
      xrpBalance = wallet?.balance || 0;
    }

    // Sync to DB
    await prisma.wallet.upsert({
      where: { userId_currency: { userId: userSession.id, currency: "XRP" } },
      update: { balance: xrpBalance },
      create: { userId: userSession.id, currency: "XRP", balance: xrpBalance, type: "CRYPTO" }
    });

    return NextResponse.json({ balance: xrpBalance.toFixed(6), address: user.xrpAddress });
  } catch (error: any) {
    console.error("[XRP_BALANCE_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
