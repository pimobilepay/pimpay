export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';
import { decrypt } from "@/lib/crypto";
import { ethers } from "ethers";

const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
};

export async function POST(req: NextRequest) {
  try {
    console.log("[v1] [WALLET_SEND] Debut du traitement...");
    
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const senderId = payload.id;

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "PI").toUpperCase();
    const recipientInput = (body.address || body.recipientIdentifier || body.recipient || "").trim();

    const MIN_CRYPTO_AMOUNT = 0.00000001;
    
    if (!recipientInput || isNaN(amount) || amount < MIN_CRYPTO_AMOUNT) {
      return NextResponse.json({ error: `Montant minimum: ${MIN_CRYPTO_AMOUNT}` }, { status: 400 });
    }

    const validateAddress = (addr: string, curr: string): boolean => {
      if (!addr || addr.length < 3) return false;
      if (curr === "PI") return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3;
      if (curr === "SDA" || curr === "SIDRA") return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      if (curr === "USDT") return /^T[a-zA-Z0-9]{33}$/.test(addr) || addr.length >= 3;
      if (curr === "BTC") return /^[13bc1][a-km-zA-HJ-NP-Z1-9]{25,62}$/.test(addr) || addr.length >= 3;
      if (["ETH", "BNB", "USDC", "DAI", "BUSD"].includes(curr)) return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      if (curr === "XLM") return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3;
      if (curr === "XRP") return /^r[a-zA-Z0-9]{24,33}$/.test(addr) || addr.length >= 3;
      if (curr === "SOL") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) || addr.length >= 3;
      return addr.length >= 3;
    };

    if (!validateAddress(recipientInput, currency)) {
      return NextResponse.json({ 
        error: `Adresse ${currency} invalide. Veuillez vérifier le format.` 
      }, { status: 400 });
    }

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Vérifier le solde de l'expéditeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency } }
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error(`Solde ${currency} insuffisant sur PimPay.`);
      }

      const cleanInput = recipientInput.startsWith('@') ? recipientInput.substring(1) : recipientInput;
      const isStellarAddress = /^G[A-Z2-7]{55}$/.test(cleanInput);
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(cleanInput);

      const recipientUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanInput, mode: 'insensitive' } },
            { email: { equals: cleanInput, mode: 'insensitive' } },
            { sidraAddress: { equals: cleanInput, mode: 'insensitive' } },
            { walletAddress: { equals: cleanInput, mode: 'insensitive' } },
            { piUserId: { equals: cleanInput, mode: 'insensitive' } },
            { usdtAddress: { equals: cleanInput, mode: 'insensitive' } },
            { solAddress: { equals: cleanInput, mode: 'insensitive' } },
            { xrpAddress: { equals: cleanInput, mode: 'insensitive' } },
            { xlmAddress: { equals: cleanInput, mode: 'insensitive' } },
            ...(isStellarAddress ? [{ xlmAddress: cleanInput }] : []),
            ...(isEvmAddress ? [{ sidraAddress: cleanInput }] : [])
          ]
        }
      });

      // C. DÉBIT DE L'EXPÉDITEUR
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } }
      });

      // --- SCENARIO 1 : TRANSFERT INTERNE ---
      if (recipientUser) {
        console.log("[v1] [WALLET_SEND] Transfert INTERNE vers:", recipientUser.id);
        if (recipientUser.id === senderId) throw new Error("Vous ne pouvez pas vous envoyer des fonds a vous-meme.");

        const getWalletType = (curr: string): WalletType => {
          if (curr === "PI") return WalletType.PI;
          if (curr === "SDA") return WalletType.SIDRA;
          if (["XAF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
          return WalletType.CRYPTO;
        };

        const toWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipientUser.id, currency } },
          update: { balance: { increment: amount } },
          create: {
            userId: recipientUser.id,
            currency,
            balance: amount,
            type: getWalletType(currency)
          }
        });

        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            toUserId: recipientUser.id,
            fromWalletId: updatedSender.id,
            toWalletId: toWallet.id,
            description: `Transfert interne vers @${recipientUser.username || 'Membre'}`
          }
        });

        await tx.notification.create({
          data: {
            userId: recipientUser.id,
            title: "Fonds reçus ! 💸",
            message: `Vous avez reçu ${amount} ${currency} de la part d'un membre PimPay.`,
            type: "payment_received"
          }
        }).catch((e) => console.log("[v1] [WALLET_SEND] Erreur notification:", e.message));
      
        console.log("[v1] [WALLET_SEND] Transaction INTERNE REUSSIE:", transaction.reference);
        return { type: 'INTERNAL', transaction };
      }

      // --- SCENARIO 2 : RETRAIT EXTERNE VERS BLOCKCHAIN ---
      else {
        console.log("[v1] [WALLET_SEND] Transfert EXTERNE vers adresse:", recipientInput);
        
        // Récupérer l'utilisateur avec ses clés privées Sidra
        const senderUser = await tx.user.findUnique({
          where: { id: senderId },
          select: { 
            piUserId: true, 
            username: true,
            sidraAddress: true,
            sidraPrivateKey: true  // clé privée Sidra chiffrée en DB
          }
        });

        let blockchainTxHash: string | null = null;
        let txStatus = TransactionStatus.SUCCESS;

        // --- BROADCAST DIRECT POUR SDA/SIDRA ---
        // La transaction on-chain part TOUJOURS du wallet PERSONNEL de
        // l'utilisateur (sa clé Sidra). C'est SON propre solde SDA qui est
        // dépensé. Le wallet central/opérateur n'envoie jamais les fonds : il
        // sert uniquement à recevoir les frais de service.
        // NB : en cas d'erreur (throw), le prisma.$transaction annule
        // automatiquement le débit DB effectué plus haut — pas besoin de
        // rembourser manuellement.
        if ((currency === "SDA" || currency === "SIDRA") && senderUser?.sidraPrivateKey) {
          try {
            let privateKey = senderUser.sidraPrivateKey;

            // Déchiffrement sécurisé de la clé stockée en DB
            if (privateKey.includes(':')) {
              try {
                const decrypted = decrypt(privateKey);
                if (decrypted && decrypted.length > 0) {
                  privateKey = decrypted;
                }
              } catch (decryptError: any) {
                console.error("[v1] [WALLET_SEND] Erreur déchiffrement clé SDA:", decryptError.message);
                throw new Error(`Clé SDA invalide ou corrompue: ${decryptError.message}`);
              }
            }

            if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;

            // Valider format clé EVM (64 caractères hex après 0x)
            if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
              throw new Error("Format de clé SDA/EVM invalide");
            }

            console.log("[v1] [WALLET_SEND] Broadcasting SDA via USER wallet...");
            const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
            const wallet = new ethers.Wallet(privateKey, provider);
            const txRes = await wallet.sendTransaction({
              to: recipientInput,
              value: ethers.parseEther(amount.toString())
            });
            const receipt = await txRes.wait();
            blockchainTxHash = receipt?.hash || txRes.hash;
            txStatus = TransactionStatus.SUCCESS;
            console.log("[v1] [WALLET_SEND] SDA confirmé via USER wallet:", blockchainTxHash);
          } catch (e: any) {
            console.error("[v1] [WALLET_SEND] Erreur blockchain SDA:", e.message);
            throw new Error(`Erreur blockchain SDA: ${e.message}`);
          }
        }
        
        // Log de transaction (WITHDRAW EXTERNE)
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.WITHDRAW,
            status: txStatus,
            blockchainTx: blockchainTxHash,
            fromUserId: senderId,
            fromWalletId: updatedSender.id,
            description: blockchainTxHash
              ? `Transfert ${currency} vers ${recipientInput.substring(0, 10)}...`
              : `Retrait ${currency} vers adresse externe : ${recipientInput}`,
            accountNumber: recipientInput,
            metadata: {
              externalAddress: recipientInput,
              destinationAddress: recipientInput,
              network: currency,
              isBlockchainWithdraw: true,
              requestedAt: new Date().toISOString(),
              ...(blockchainTxHash && { confirmedAt: new Date().toISOString() }),
              ...(currency === "PI" && senderUser?.piUserId && {
                piUid: senderUser.piUserId,
                senderUsername: senderUser.username
              })
            }
          }
        });

        console.log("[v1] [WALLET_SEND] Transaction EXTERNE créée:", transaction.reference, blockchainTxHash ? `(broadcast: ${blockchainTxHash})` : "(queued)");
        return { type: 'EXTERNAL', transaction, blockchainTx: blockchainTxHash };
      }

    }, { maxWait: 10000, timeout: 60000 }); // timeout augmenté pour attendre la confirmation blockchain
    
    const isDirectBlockchainTransfer = result.type === 'EXTERNAL' && result.blockchainTx;
    
    return NextResponse.json({
      success: true,
      mode: result.type,
      message: result.type === 'INTERNAL'
        ? "Transfert instantané r��ussi"
        : (isDirectBlockchainTransfer ? "Transfert blockchain confirmé" : "Retrait blockchain enregistré (en attente)"),
      reference: result.transaction.reference,
      transaction: result.transaction,
      blockchainTx: result.blockchainTx || null
    });

  } catch (error: any) {
    console.error("[v1] [WALLET_SEND] ERREUR:", error.message);
    const safeErrors = ["Solde", "insuffisant", "invalide", "vous-meme", "Cle", "Clé", "annulé", "restitué", "Sidra", "blockchain", "SDA", "corrompue"];
    const isSafeError = safeErrors.some(e => error.message?.includes(e));
    return NextResponse.json({ 
      error: isSafeError ? error.message : "Erreur lors du transfert" 
    }, { status: 400 });
  }
}
