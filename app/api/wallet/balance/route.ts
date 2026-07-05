export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto"; // ✅ AES-256-GCM centralisé
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { ethers } from "ethers";
import * as StellarSdk from "@stellar/stellar-sdk";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@noble/secp256k1";
import bs58 from "bs58";
import { getTrxBalance, getUsdtBalance } from "@/lib/blockchain/tron";
import { creditTronDeposit } from "@/lib/blockchain/tron-credit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bytesToWif(privKey: Buffer): string {
  const payload = Buffer.concat([Buffer.from([0x80]), privKey, Buffer.from([0x01])]);
  const hash1 = crypto.createHash("sha256").update(payload).digest();
  const hash2 = crypto.createHash("sha256").update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  return bs58.encode(Buffer.concat([payload, checksum]));
}

function generateXrpKeypair() {
  const seed = crypto.randomBytes(16);
  const alphabet = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
  const hash = crypto.createHash("sha256").update(seed).digest();
  const ripemd = crypto.createHash("ripemd160").update(hash).digest();

  let address = "r";
  for (let i = 0; i < 24; i++) address += alphabet[ripemd[i % ripemd.length] % alphabet.length];

  let secret = "s";
  for (let i = 0; i < 28; i++) secret += alphabet[seed[i % seed.length] % alphabet.length];

  return { address, secret };
}

const SIDRA_RPC = "https://rpc.sidrachain.com";
const TRON_VALID_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

// ---------------------------------------------------------------------------
// ✅ FIX PRINCIPAL : Sync USDT on-chain sans écraser le solde interne
//
// AVANT (bugué) :
//   update: { balance: usdtBalance }          <-- écrase le crédit interne P2P
//
// APRÈS (corrigé) :
//   On compare le solde on-chain et le solde DB.
//   - Si on-chain > DB : un dépôt externe est arrivé → on prend on-chain (plus grand).
//   - Si DB > on-chain : un transfert interne P2P a crédité ce wallet → on garde DB.
//   On prend donc le MAX des deux valeurs.
//
// Pourquoi ?
//   Les transferts internes PimPay ne passent PAS par la blockchain.
//   Le solde on-chain ne les reflète pas. Si on l'écrase, le destinataire
//   perd son crédit et seul l'historique de transaction reste visible.
// ---------------------------------------------------------------------------
async function syncUsdtBalanceSafe(
  userId: string,
  usdtAddress: string
): Promise<void> {
  try {
    const onChainBalance = await getUsdtBalance(usdtAddress);
    // ✅ FIX : on passe par le helper qui crédite ET enregistre
    // la transaction DEPOSIT + la notification (historique user/admin).
    await creditTronDeposit({ userId, currency: "USDT", blockchainBalance: onChainBalance });
  } catch {
    // Silencieux — on garde la valeur DB existante
  }
}

// Idem pour TRX (même adresse que USDT sur TRON)
async function syncTrxBalanceSafe(
  userId: string,
  usdtAddress: string
): Promise<void> {
  try {
    const onChainBalance = await getTrxBalance(usdtAddress);
    // ✅ FIX : on passe par le helper qui crédite ET enregistre
    // la transaction DEPOSIT + la notification (historique user/admin).
    await creditTronDeposit({ userId, currency: "TRX", blockchainBalance: onChainBalance });
  } catch {
    // Silencieux
  }
}

// ---------------------------------------------------------------------------
// GET /api/wallet/balance
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // [FIX V16] Auth centralisée et vérifiée cryptographiquement.
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- Fetch user with wallets ---
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // --- Auto-générer l'adresse XLM/Stellar ---
    if (!user.xlmAddress) {
      try {
        const keypair = StellarSdk.Keypair.random();
        const publicKey = keypair.publicKey();
        const secretKey = keypair.secret();
        const encryptedSecret = encrypt(secretKey);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { xlmAddress: publicKey, stellarPrivateKey: encryptedSecret },
          });
          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "XLM" } },
            update: { depositMemo: publicKey },
            create: { userId, currency: "XLM", type: "CRYPTO", balance: 0, depositMemo: publicKey },
          });
        });

        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true, sidraAddress: true, xrpAddress: true,
            xlmAddress: true, solAddress: true, usdtAddress: true, wallets: true,
          },
        }) as typeof user;
      } catch (e) {
        console.error("[BALANCE_API] Failed to auto-generate XLM address:", e);
      }
    }

    // --- Auto-générer l'adresse SOL/Solana ---
    if (!user.solAddress) {
      try {
        const keypair = SolanaKeypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const secretKey = bs58.encode(keypair.secretKey);
        const encryptedSecret = encrypt(secretKey);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { solAddress: publicKey, solPrivateKey: encryptedSecret },
          });
          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "SOL" } },
            update: { depositMemo: publicKey },
            create: { userId, currency: "SOL", type: "CRYPTO", balance: 0, depositMemo: publicKey },
          });
        });

        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true, sidraAddress: true, xrpAddress: true,
            xlmAddress: true, solAddress: true, usdtAddress: true, wallets: true,
          },
        }) as typeof user;
      } catch (e) {
        console.error("[BALANCE_API] Failed to auto-generate SOL address:", e);
      }
    }

    // --- Auto-générer l'adresse BTC ---
    let btcWallet = user.wallets.find((w) => w.currency === "BTC");
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
              create: { userId, currency: "BTC", type: "CRYPTO", balance: 0, depositMemo: btcAddress },
            });
            await tx.vault
              .create({ data: { userId, name: `BTC_SECRET:${encryptedKey}`, amount: 0 } })
              .catch(() => null);
          });

          user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              walletAddress: true, sidraAddress: true, xrpAddress: true,
              xlmAddress: true, solAddress: true, usdtAddress: true, wallets: true,
            },
          }) as typeof user;

          btcWallet = user.wallets.find((w) => w.currency === "BTC");
        }
      } catch (e) {
        console.error("[BALANCE_API] Failed to auto-generate BTC address:", e);
      }
    }

    // --- Auto-générer l'adresse XRP ---
    if (!user.xrpAddress) {
      try {
        const { address: xrpAddress, secret: xrpSecret } = generateXrpKeypair();
        const encryptedSecret = encrypt(xrpSecret);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { xrpAddress, xrpPrivateKey: encryptedSecret },
          });
          await tx.wallet.upsert({
            where: { userId_currency: { userId, currency: "XRP" } },
            update: { depositMemo: xrpAddress, type: "CRYPTO" },
            create: { userId, currency: "XRP", type: "CRYPTO", balance: 0, depositMemo: xrpAddress },
          });
        });

        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            walletAddress: true, sidraAddress: true, xrpAddress: true,
            xlmAddress: true, solAddress: true, usdtAddress: true, wallets: true,
          },
        }) as typeof user;
      } catch (e) {
        console.error("[BALANCE_API] Failed to auto-generate XRP address:", e);
      }
    }

    // --- Validation + auto-réparation adresse USDT (TRC20) ---
    let usdtAddress = user.usdtAddress || "";
    if (usdtAddress && !TRON_VALID_REGEX.test(usdtAddress)) {
      console.warn("[BALANCE_API] Adresse USDT invalide détectée, régénération...");
      try {
        const { Wallet: EthWallet } = await import("ethers");
        const nodeCrypto = await import("crypto");
        const { encrypt: encryptKey } = await import("@/lib/crypto");
        const evmWallet = EthWallet.createRandom();
        const privKey = evmWallet.privateKey.replace("0x", "");
        const ethAddress = evmWallet.address;
        const addrBytes = Buffer.concat([
          Buffer.from("41", "hex"),
          Buffer.from(ethAddress.replace("0x", ""), "hex"),
        ]);
        const h1 = nodeCrypto.default.createHash("sha256").update(addrBytes).digest();
        const h2 = nodeCrypto.default.createHash("sha256").update(h1).digest();
        const payload = Buffer.concat([addrBytes, h2.slice(0, 4)]);
        const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        let n = BigInt("0x" + payload.toString("hex"));
        let addr = "";
        while (n > 0n) { addr = B58[Number(n % 58n)] + addr; n = n / 58n; }
        await prisma.user.update({
          where: { id: userId },
          data: { usdtAddress: addr, usdtPrivateKey: encryptKey(privKey) },
        });
        usdtAddress = addr;
      } catch (repairErr) {
        console.error("[BALANCE_API] Echec réparation USDT:", repairErr);
      }
    }

    // --- Sync SDA depuis Sidra blockchain ---
    let sdaBalanceValue = 0;
    if (user.sidraAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        const balanceRaw = (await Promise.race([
          provider.getBalance(user.sidraAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
        ])) as bigint;

        sdaBalanceValue = parseFloat(ethers.formatEther(balanceRaw));

        await prisma.wallet
          .upsert({
            where: { userId_currency: { userId, currency: "SDA" } },
            update: { balance: sdaBalanceValue },
            create: { userId, currency: "SDA", balance: sdaBalanceValue, type: "SIDRA" },
          })
          .catch(() => null);
      } catch {
        const existingSda = user.wallets.find(
          (w) => w.currency === "SDA" || w.currency === "SIDRA"
        );
        if (existingSda) sdaBalanceValue = existingSda.balance;
      }
    } else {
      const existingSda = user.wallets.find(
        (w) => w.currency === "SDA" || w.currency === "SIDRA"
      );
      if (existingSda) sdaBalanceValue = existingSda.balance;
    }

    // --- Sync BNB depuis BSC ---
    if (user.sidraAddress) {
      try {
        const BSC_RPC = "https://bsc-dataseed1.binance.org/";
        const bscProvider = new ethers.JsonRpcProvider(BSC_RPC);
        const bnbRaw = (await Promise.race([
          bscProvider.getBalance(user.sidraAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error("BNB Timeout")), 5000)),
        ])) as bigint;

        const bnbBalance = parseFloat(ethers.formatEther(bnbRaw));
        await prisma.wallet
          .upsert({
            where: { userId_currency: { userId, currency: "BNB" } },
            update: { balance: bnbBalance },
            create: { userId, currency: "BNB", balance: bnbBalance, type: "CRYPTO" },
          })
          .catch(() => null);
      } catch {
        // Silencieux
      }
    }

    // ✅ FIX : Sync USDT et TRX avec protection du solde interne
    if (usdtAddress && TRON_VALID_REGEX.test(usdtAddress)) {
      await syncUsdtBalanceSafe(userId, usdtAddress);
      await syncTrxBalanceSafe(userId, usdtAddress);
    }

    // --- Construire la map des soldes ---
    // ⚠️ On recharge les wallets APRES les sync pour avoir les valeurs à jour
    const freshWalletsForMap = await prisma.wallet.findMany({ where: { userId } });
    const balancesMap: Record<string, string> = {};
    for (const wallet of freshWalletsForMap) {
      const key = wallet.currency === "SIDRA" ? "SDA" : wallet.currency;
      balancesMap[key] = wallet.balance.toFixed(8);
    }

    // SDA vient du RPC (plus fiable)
    balancesMap["SDA"] = sdaBalanceValue.toFixed(4);

    // Re-fetch des adresses fraîches
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xrpAddress: true, xlmAddress: true, sidraAddress: true,
        usdtAddress: true, solAddress: true, walletAddress: true,
      },
    });
    if (freshUser) {
      user.xrpAddress = freshUser.xrpAddress;
      user.xlmAddress = freshUser.xlmAddress;
      user.sidraAddress = freshUser.sidraAddress;
      user.usdtAddress = freshUser.usdtAddress;
      user.solAddress = freshUser.solAddress;
      user.walletAddress = freshUser.walletAddress;
    }

    const freshWallets = await prisma.wallet.findMany({ where: { userId } });
    const finalBtcWallet = freshWallets.find((w) => w.currency === "BTC");

    const evmAddress = user.sidraAddress || "";
    const stellarAddress = user.xlmAddress || "";
    const tronAddress = user.usdtAddress || usdtAddress;
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
      EURC: balancesMap["EURC"] || "0.0000",
      OUSD: balancesMap["OUSD"] || "0.0000",
      XRP: balancesMap["XRP"] || "0.000000",
      XLM: balancesMap["XLM"] || "0.0000000",
      XAF: balancesMap["XAF"] || "0.00",
      MATIC: balancesMap["MATIC"] || "0.00000000",
      addresses: {
        PI: user.walletAddress || stellarAddress,
        XLM: stellarAddress,
        SDA: evmAddress,
        ETH: evmAddress,
        BNB: evmAddress,
        MATIC: evmAddress,
        USDC: evmAddress,
        DAI: evmAddress,
        BUSD: evmAddress,
        EURC: evmAddress,
        OUSD: evmAddress,
        ADA: evmAddress,
        DOGE: evmAddress,
        TON: evmAddress,
        USDT: tronAddress,
        TRX: tronAddress,
        BTC: finalBtcWallet?.depositMemo || "",
        XRP: user.xrpAddress || "",
        SOL: solAddr,
      },
      wallets: freshWallets.map((w) => ({
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
