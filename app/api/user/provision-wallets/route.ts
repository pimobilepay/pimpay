/**
 * app/api/user/provision-wallets/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Provision XRP + Stellar wallets via lib/crypto (AES-256-GCM).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto"; // ✅ Centralisé AES-256-GCM
import crypto from "node:crypto";
import * as StellarSdk from "@stellar/stellar-sdk";

export const dynamic = "force-dynamic";

// ─── Générateurs ──────────────────────────────────────────────────────────────

function createXrpKeys() {
  const seed = crypto.randomBytes(16);
  const alphabet = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
  const hash = crypto
    .createHash("ripemd160")
    .update(crypto.createHash("sha256").update(seed).digest())
    .digest();
  let addr = "r";
  for (let i = 0; i < 24; i++) addr += alphabet[hash[i % hash.length] % alphabet.length];
  let sec = "s";
  for (let i = 0; i < 28; i++) sec += alphabet[seed[i % seed.length] % alphabet.length];
  return { addr, sec };
}

function createStellarKeys() {
  const keypair = StellarSdk.Keypair.random();
  return {
    pub: keypair.publicKey(),
    priv: keypair.secret(),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.id;

    const xrp     = createXrpKeys();
    const stellar = createStellarKeys();

    // ✅ Chiffrement AES-256-GCM via lib/crypto centralisé
    const encXrp     = encrypt(xrp.sec);
    const encStellar = encrypt(stellar.priv);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xrpAddress:       xrp.addr,
          xrpPrivateKey:    encXrp,
          xlmAddress:       stellar.pub,
          stellarPrivateKey: encStellar,
        },
      });

      const currencies = [
        { code: "XRP", addr: xrp.addr,     type: "CRYPTO" },
        { code: "XLM", addr: stellar.pub,  type: "CRYPTO" },
        { code: "XAF", addr: null,          type: "FIAT" },
      ];

      for (const curr of currencies) {
        await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: curr.code } },
          update: {},
          create: {
            userId,
            currency:     curr.code,
            type:         curr.type as any,
            depositMemo:  curr.addr || undefined,
            balance:      0,
          },
        });
      }

      return updatedUser;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      wallets: [
        { currency: "XRP", address: xrp.addr },
        { currency: "XLM", address: stellar.pub },
      ],
    });
  } catch (error: any) {
    console.error("[PROVISIONING_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des wallets" },
      { status: 500 }
    );
  }
}
