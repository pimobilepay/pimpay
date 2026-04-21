export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { ethers } from "ethers";
import * as StellarSdk from "@stellar/stellar-sdk";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@noble/secp256k1';
import bs58 from "bs58";
import crypto from "node:crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "pimpay-default-secret-key-32-chars";

// Fonction pour chiffrer les clés privées
function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

// Fonction pour convertir la clé privée en WIF (Bitcoin)
function bytesToWif(privKey: Buffer): string {
  const payload = Buffer.concat([Buffer.from([0x80]), privKey, Buffer.from([0x01])]);
  const hash1 = crypto.createHash('sha256').update(payload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

// Fonction pour générer une adresse XRP valide
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

const SIDRA_RPC = "https://rpc.sidrachain.com";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // --- AUTH: Hybrid token recovery via lib/auth ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (!payload) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
      userId = payload.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- Fetch user with wallets (only safe fields) ---
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        sidraAddress: true,
        xrpAddress: true,
        xlmAddress: true,
        solAddress: true,
        usdtAddress: true,
        wallets: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // --- Auto-générer l'adresse XLM/Stellar si elle n'existe pas ---
    if (!user.xlmAddress) {
      try {
        const keypair = StellarSdk.Keypair.random();
        const publicKey = keypair.publicKey();
        const secretKey = keypair.secret();
        const encryptedSecret = encrypt(secretKey);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              xlmAddress: publicKey,
              stellarPrivateKey: encryptedSecret
            }
          });

          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "XLM" } },
            update: { depositMemo: publicKey },
            create: {
              userId,
              currency: "XLM",
              type: "CRYPTO",
              balance: 0,
              depositMemo: publicKey,
            }
          });
        });

        // Recharger l'utilisateur avec la nouvelle adresse
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true,
            sidraAddress: true,
            xrpAddress: true,
            xlmAddress: true,
            solAddress: true,
            usdtAddress: true,
            wallets: true,
          }
        }) as typeof user;

        console.log("[BALANCE_API] Auto-generated XLM address:", publicKey);
      } catch (xlmError) {
        console.error("[BALANCE_API] Failed to auto-generate XLM address:", xlmError);
      }
    }

    // --- Auto-générer l'adresse SOL/Solana si elle n'existe pas ---
    if (!user.solAddress) {
      try {
        const keypair = SolanaKeypair.generate();
        const publicKey = keypair.publicKey.toBase58(); // Adresse Solana (32-44 chars, Base58)
        const secretKey = bs58.encode(keypair.secretKey); // Clé privée en Base58
        const encryptedSecret = encrypt(secretKey);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              solAddress: publicKey,
              solPrivateKey: encryptedSecret
            }
          });

          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "SOL" } },
            update: { depositMemo: publicKey },
            create: {
              userId,
              currency: "SOL",
              type: "CRYPTO",
              balance: 0,
              depositMemo: publicKey,
            }
          });
        });

        // Recharger l'utilisateur avec la nouvelle adresse
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true,
            sidraAddress: true,
            xrpAddress: true,
            xlmAddress: true,
            solAddress: true,
            usdtAddress: true,
            wallets: true,
          }
        }) as typeof user;

        console.log("[BALANCE_API] Auto-generated SOL address:", publicKey);
      } catch (solError) {
        console.error("[BALANCE_API] Failed to auto-generate SOL address:", solError);
      }
    }

    // --- Auto-générer l'adresse BTC/Bitcoin si elle n'existe pas ---
    let btcWallet = user.wallets.find(w => w.currency === "BTC");
    if (!btcWallet?.depositMemo) {
      try {
        const privKeyBytes = crypto.randomBytes(32);
        const pubKey = Buffer.from(ecc.getPublicKey(privKeyBytes, true));

        const { address: btcAddress } = bitcoin.payments.p2wpkh({
          pubkey: pubKey,
          network: bitcoin.networks.bitcoin,
        });

        if (btcAddress) {
          const wif = bytesToWif(privKeyBytes);
          const encryptedKey = encrypt(wif);

          await prisma.$transaction(async (tx) => {
            await tx.wallet.upsert({
              where: { userId_currency: { userId, currency: "BTC" } },
              update: { depositMemo: btcAddress, type: "CRYPTO" },
              create: {
                userId,
                currency: "BTC",
                type: "CRYPTO",
                balance: 0,
                depositMemo: btcAddress,
              }
            });

            // Stocker la clé privée chiffrée dans Vault
            await tx.vault.create({
              data: { userId, name: `BTC_PRIV_${btcAddress}`, amount: 0 }
            }).catch(() => null); // Ignore si déjà existant
          });

          // Recharger l'utilisateur avec la nouvelle adresse
          user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              walletAddress: true,
              sidraAddress: true,
              xrpAddress: true,
              xlmAddress: true,
              solAddress: true,
              usdtAddress: true,
              wallets: true,
            }
          }) as typeof user;

          btcWallet = user.wallets.find(w => w.currency === "BTC");
          console.log("[BALANCE_API] Auto-generated BTC address:", btcAddress);
        }
      } catch (btcError) {
        console.error("[BALANCE_API] Failed to auto-generate BTC address:", btcError);
      }
    }

    // --- Auto-générer l'adresse XRP/Ripple si elle n'existe pas ---
    if (!user.xrpAddress) {
      try {
        const { address: xrpAddress, secret: xrpSecret } = generateXrpKeypair();
        const encryptedSecret = encrypt(xrpSecret);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { 
              xrpAddress: xrpAddress, 
              xrpPrivateKey: encryptedSecret
            }
          });

          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "XRP" } },
            update: { depositMemo: xrpAddress, type: "CRYPTO" },
            create: {
              userId,
              currency: "XRP",
              type: "CRYPTO",
              balance: 0,
              depositMemo: xrpAddress,
            }
          });
        });

        // Recharger l'utilisateur avec la nouvelle adresse
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true,
            sidraAddress: true,
            xrpAddress: true,
            xlmAddress: true,
            solAddress: true,
            usdtAddress: true,
            wallets: true,
          }
        }) as typeof user;

        console.log("[BALANCE_API] Auto-generated XRP address:", xrpAddress);
      } catch (xrpError) {
        console.error("[BALANCE_API] Failed to auto-generate XRP address:", xrpError);
      }
    }

    const usdtAddress = user.usdtAddress || "";

    // --- Fetch real SDA balance from Sidra blockchain ---
    let sdaBalanceValue = 0;
    if (user.sidraAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        const balanceRaw = await Promise.race([
          provider.getBalance(user.sidraAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
        ]) as bigint;

        const formattedSda = ethers.formatEther(balanceRaw);
        sdaBalanceValue = parseFloat(formattedSda);

        // Sync SDA balance to DB (currency: "SDA", type: "SIDRA")
        await prisma.wallet.upsert({
          where: { userId_currency: { userId, currency: "SDA" } },
          update: { balance: sdaBalanceValue },
          create: { userId, currency: "SDA", balance: sdaBalanceValue, type: "SIDRA" }
        }).catch(() => null);
      } catch (rpcError) {
        console.error("RPC ERROR (Sidra):", rpcError);
        // Fallback to last known DB value
        const existingSda = user.wallets.find(w => w.currency === "SDA" || w.currency === "SIDRA");
        if (existingSda) sdaBalanceValue = existingSda.balance;
      }
    } else {
      const existingSda = user.wallets.find(w => w.currency === "SDA" || w.currency === "SIDRA");
      if (existingSda) sdaBalanceValue = existingSda.balance;
    }

    // --- Build balances map from all wallets ---
    const balancesMap: Record<string, string> = {};
    for (const wallet of user.wallets) {
      // Normalize SIDRA -> SDA for frontend
      const key = wallet.currency === "SIDRA" ? "SDA" : wallet.currency;
      balancesMap[key] = wallet.balance.toFixed(8);
    }

    // Ensure SDA is up to date
    balancesMap["SDA"] = sdaBalanceValue.toFixed(4);

    // Refresh btcWallet reference after potential auto-generation
    const finalBtcWallet = user.wallets.find(w => w.currency === "BTC");

    // --- Build addresses map using group logic ---
    // EVM Group: ETH, BNB, SDA, MATIC, USDC, DAI, BUSD share sidraAddress
    const evmAddress = user.sidraAddress || "";
    // Stellar Group: PI, XLM share xlmAddress  
    const stellarAddress = user.xlmAddress || "";
    // Tron Group: TRX, USDT share usdtAddress
    const tronAddress = usdtAddress;
    // Unique: SOL uses solAddress
    const solAddr = user.solAddress || "";

    return NextResponse.json({
      success: true,
      ...balancesMap,
      PI: balancesMap["PI"] || "0.0000",
      USDT: balancesMap["USDT"] || "0.00",
      BTC: balancesMap["BTC"] || "0.00000000",
      SDA: balancesMap["SDA"],
      ETH: balancesMap["ETH"] || "0.00000000",
      BNB: balancesMap["BNB"] || "0.00000000",
      SOL: balancesMap["SOL"] || "0.00000000",
      TRX: balancesMap["TRX"] || "0.000000",
      ADA: balancesMap["ADA"] || "0.000000",
      DOGE: balancesMap["DOGE"] || "0.000000",
      TON: balancesMap["TON"] || "0.000000",
      USDC: balancesMap["USDC"] || "0.0000",
      DAI: balancesMap["DAI"] || "0.0000",
      BUSD: balancesMap["BUSD"] || "0.0000",
      XRP: balancesMap["XRP"] || "0.000000",
      XLM: balancesMap["XLM"] || "0.0000000",
      XAF: balancesMap["XAF"] || "0.00",
      MATIC: balancesMap["MATIC"] || "0.00000000",
      addresses: {
        // Stellar / Pi Network group
        PI: user.walletAddress || stellarAddress,
        XLM: stellarAddress,
        // EVM group (shared sidraAddress)
        SDA: evmAddress,
        ETH: evmAddress,
        BNB: evmAddress,
        MATIC: evmAddress,
        USDC: evmAddress,
        DAI: evmAddress,
        BUSD: evmAddress,
        ADA: evmAddress,
        DOGE: evmAddress,
        TON: evmAddress,
        // Tron group (shared usdtAddress)
        USDT: tronAddress,
        TRX: tronAddress,
        // Unique chains
        BTC: finalBtcWallet?.depositMemo || "",
        XRP: user.xrpAddress || "",
        SOL: solAddr,
      },
      wallets: user.wallets.map(w => ({
        currency: w.currency === "SIDRA" ? "SDA" : w.currency,
        balance: w.balance,
        depositMemo: w.depositMemo,
        type: w.type,
      })),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("BALANCE_FETCH_ERROR:", message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
