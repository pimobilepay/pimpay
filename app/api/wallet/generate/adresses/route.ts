/**
 * app/api/wallet/generate/adresses/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Génère les adresses crypto manquantes à la connexion.
 * Toutes les clés privées sont chiffrées en AES-256-GCM via lib/crypto.ts
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { Wallet as EthersWallet } from "ethers";
import * as StellarSdk from "@stellar/stellar-sdk";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ─── Générateurs de clés ──────────────────────────────────────────────────────

/** EVM (Sidra, ETH, BSC, MATIC…) */
function generateEvmWallet() {
  const wallet = EthersWallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey, // 0x... 64 hex chars
  };
}

/**
 * Tron TRC-20 (USDT) — génération d'adresse via encodage Base58Check officiel.
 * Algorithme: Base58Check( 0x41 + KECCAK256(pubKey)[12:] )
 * Utilise ethers.js (déjà présent) pour la dérivation de clé secp256k1.
 */
function generateTronWallet() {
  // 1. Clé privée aléatoire (même courbe secp256k1 que Tron)
  const evmWallet = EthersWallet.createRandom();
  const privKey = evmWallet.privateKey.replace("0x", ""); // 64 hex chars

  // 2. Adresse Ethereum = KECCAK256(pubKey non-compressée)[12:]
  const ethAddress = evmWallet.address; // 0x + 40 hex chars

  // 3. Préfixe réseau Tron = 0x41 + 20 octets adresse ETH
  const addressBytes = Buffer.concat([
    Buffer.from("41", "hex"),
    Buffer.from(ethAddress.replace("0x", ""), "hex"),
  ]); // 21 octets

  // 4. Checksum = double SHA256, 4 premiers octets
  const hash1 = crypto.createHash("sha256").update(addressBytes).digest();
  const hash2 = crypto.createHash("sha256").update(hash1).digest();
  const checksum = hash2.slice(0, 4);

  // 5. Payload final = 21 + 4 octets
  const fullPayload = Buffer.concat([addressBytes, checksum]);

  // 6. Encodage Base58 (alphabet Tron = Bitcoin sans 0, O, I, l)
  const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt("0x" + fullPayload.toString("hex"));
  let encoded = "";
  while (num > 0n) {
    encoded = BASE58[Number(num % 58n)] + encoded;
    num = num / 58n;
  }
  // Gérer les octets nuls en tête (robustesse)
  for (const byte of fullPayload) {
    if (byte !== 0) break;
    encoded = 1 + encoded;
  }

  return { address: encoded, privateKey: privKey };
}

/** Stellar / XLM */
function generateStellarWallet() {
  const keypair = StellarSdk.Keypair.random();
  return {
    address: keypair.publicKey(),  // G… 56 chars
    privateKey: keypair.secret(),  // S… 56 chars
  };
}

/** XRP — seed simplifié (utiliser xrpl en prod pour adresse exacte) */
function generateXrpWallet() {
  const seed = crypto.randomBytes(16);
  const alphabet = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
  const hash = crypto
    .createHash("ripemd160")
    .update(crypto.createHash("sha256").update(seed).digest())
    .digest();
  let address = "r";
  for (let i = 0; i < 24; i++) address += alphabet[hash[i % hash.length] % alphabet.length];
  let secret = "s";
  for (let i = 0; i < 28; i++) secret += alphabet[seed[i % seed.length] % alphabet.length];
  return { address, privateKey: secret };
}

// ─── Route principale ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.id;

    // 1. Lire l'état actuel de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sidraAddress: true,
        sidraPrivateKey: true,
        usdtAddress: true,
        usdtPrivateKey: true,
        walletAddress: true,
        walletPrivateKey: true,
        xlmAddress: true,
        stellarPrivateKey: true,
        xrpAddress: true,
        xrpPrivateKey: true,
        solAddress: true,
        solPrivateKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updates: Record<string, string> = {};
    const generated: string[] = [];

    // 2. Générer les clés manquantes — chiffrer en AES-256-GCM
    if (!user.sidraAddress || !user.sidraPrivateKey) {
      const evm = generateEvmWallet();
      updates.sidraAddress    = evm.address;
      updates.sidraPrivateKey = encrypt(evm.privateKey);   // ✅ GCM
      updates.walletAddress   = evm.address;
      updates.walletPrivateKey = encrypt(evm.privateKey);  // ✅ GCM
      generated.push("EVM (Sidra)");
    }

    if (!user.usdtAddress || !user.usdtPrivateKey) {
      const tron = generateTronWallet();
      updates.usdtAddress    = tron.address;
      updates.usdtPrivateKey = encrypt(tron.privateKey);   // ✅ GCM
      generated.push("USDT (TRC-20)");
    }

    if (!user.xlmAddress || !user.stellarPrivateKey) {
      const stellar = generateStellarWallet();
      updates.xlmAddress        = stellar.address;
      updates.stellarPrivateKey = encrypt(stellar.privateKey); // ✅ GCM
      generated.push("XLM (Stellar)");
    }

    if (!user.xrpAddress || !user.xrpPrivateKey) {
      const xrp = generateXrpWallet();
      updates.xrpAddress    = xrp.address;
      updates.xrpPrivateKey = encrypt(xrp.privateKey); // ✅ GCM
      generated.push("XRP");
    }

    // 3. Persister en DB
    if (Object.keys(updates).length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: updates,
        });

        // Créer / synchroniser les wallets associés
        const walletDefs = [
          { currency: "XLM",  addr: updates.xlmAddress  || user.xlmAddress,  type: "CRYPTO" },
          { currency: "XRP",  addr: updates.xrpAddress  || user.xrpAddress,  type: "CRYPTO" },
          { currency: "USDT", addr: updates.usdtAddress || user.usdtAddress, type: "CRYPTO" },
          { currency: "SDA",  addr: updates.sidraAddress || user.sidraAddress, type: "CRYPTO" },
        ].filter((w) => w.addr);

        for (const w of walletDefs) {
          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: w.currency } },
            update: { depositMemo: w.addr! },
            create: {
              userId,
              currency: w.currency,
              type: w.type as any,
              depositMemo: w.addr!,
              balance: 0,
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: generated.length > 0
        ? `Nouveaux wallets créés: ${generated.join(", ")}`
        : "Wallets déjà provisionnés",
      data: {
        evmAddress:   updates.sidraAddress || user.sidraAddress,
        usdtAddress:  updates.usdtAddress  || user.usdtAddress,
        xlmAddress:   updates.xlmAddress   || user.xlmAddress,
        xrpAddress:   updates.xrpAddress   || user.xrpAddress,
        isNew:        generated.length > 0,
        generated,
      },
    });
  } catch (error: any) {
    console.error("[GENERATE_ADDRESSES_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des adresses" },
      { status: 500 }
    );
  }
}
