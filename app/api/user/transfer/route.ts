export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { ethers } from "ethers";
import { decrypt } from "@/lib/crypto";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
};

function getWalletType(currency: string): WalletType {
  if (currency === "PI") return WalletType.PI;
  if (currency === "SDA") return WalletType.SIDRA;
  if (["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND", "MGA"].includes(currency))
    return WalletType.FIAT;
  return WalletType.CRYPTO;
}

function isExternalAddress(identifier: string): boolean {
  const s = (identifier || "").trim();
  if (!s || s.length < 20) return false;
  if (/^G[A-Z2-7]{55}$/.test(s)) return true;
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(s)) return true;
  if (/^r[a-zA-Z0-9]{24,33}$/.test(s)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true;
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(s)) return true;
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(s)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // [FIX #7] Rate limiting — 20 requêtes / 60s par IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`transfer:${ip}`, 20, 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter avant de réessayer." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Debut du traitement...");
    
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;

    if (!token) {
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Erreur: Pas de token");
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Erreur: Token invalide");
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const senderId = payload.id;

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "PI").toUpperCase().trim();
    const recipientInput = (body.recipientIdentifier || body.recipient || body.address || body.email || "").trim();
    const description = body.description || "";

    if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Params:", { senderId, amount, currency, recipientInput: recipientInput.substring(0, 20) + "..." });

    if (!recipientInput) {
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Erreur: Destinataire manquant");
      return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Erreur: Montant invalide", amount);
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const feeConfig = await getFeeConfig();
    const { feeAmount: fee, totalDebit } = calculateFee(amount, feeConfig, "transfer");

    const result = await prisma.$transaction(async (tx) => {
      // FIX: Récupérer les infos de l'expéditeur (sender) pour les notifications et clés
      const senderUser = await tx.user.findUnique({
        where: { id: senderId },
        select: { 
            name: true, 
            username: true, 
            sidraPrivateKey: true, 
            stellarPrivateKey: true,
            piUserId: true // Pour le flux A2U Pi Network
        }
      });

      const senderName = senderUser?.name || senderUser?.username || "Un utilisateur PimPay";

      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency } },
      });

      if (!senderWallet) throw new Error(`Vous n'avez pas de portefeuille ${currency}.`);
      if (senderWallet.balance < totalDebit) throw new Error(`Solde insuffisant.`);

      let cleanInput = recipientInput.startsWith("@") ? recipientInput.substring(1) : recipientInput;
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Recherche destinataire:", cleanInput);
      
      // Support pour le format PIMPAY-XXXXXX (code marchand de mpay)
      let recipientUser = null;
      if (cleanInput.toUpperCase().startsWith("PIMPAY-")) {
        const userIdPart = cleanInput.replace(/PIMPAY-/i, "").toLowerCase();
        recipientUser = await tx.user.findFirst({
          where: {
            id: { startsWith: userIdPart }
          }
        });
      }
      
      // Si pas trouve par PIMPAY, rechercher par autres identifiants
      if (!recipientUser) {
        recipientUser = await tx.user.findFirst({
          where: {
            OR: [
              { username: { equals: cleanInput, mode: "insensitive" } },
              { email: { equals: cleanInput, mode: "insensitive" } },
              { phone: cleanInput },
              { sidraAddress: cleanInput },
              { walletAddress: cleanInput },
              { xlmAddress: cleanInput },
              { piUserId: cleanInput },
              { id: cleanInput }, // Recherche directe par ID
            ],
          },
        });
      }
      
      if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Destinataire trouve:", recipientUser ? `ID: ${recipientUser.id}` : "NON (transfert externe)");

      // Verification d'auto-envoi AVANT le debit - doit etre faite ici
      if (recipientUser && recipientUser.id === senderId) {
        throw new Error("Auto-envoi interdit.");
      }

      // Verifier que le destinataire existe pour les transferts internes ou que c'est une adresse externe valide
      if (!recipientUser && !isExternalAddress(recipientInput)) {
        throw new Error("Destinataire ou adresse invalide.");
      }

      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDebit } },
      });

      if (recipientUser) {
        if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Transfert INTERNE vers:", recipientUser.id);
        
        const toWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId: recipientUser.id, currency } },
          update: { balance: { increment: amount } },
          create: { userId: recipientUser.id, currency, balance: amount, type: getWalletType(currency) },
        });
        
        if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Wallet destinataire credite:", toWallet.id, "nouveau solde:", toWallet.balance);

        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-INT-${nanoid(10).toUpperCase()}`,
            amount, fee, netAmount: amount, currency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            toUserId: recipientUser.id,
            fromWalletId: updatedSender.id,
            toWalletId: toWallet.id,
            description: description || `Transfert interne vers @${recipientUser.username}`,
          },
        });
        
        if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Transaction creee:", transaction.reference);

        await tx.notification.create({
          data: {
            userId: recipientUser.id,
            title: "Paiement recu !",
            message: `Vous avez recu ${amount.toLocaleString()} ${currency} de ${senderName}.`,
            type: "PAYMENT_RECEIVED",
            metadata: { amount, currency, senderName, reference: transaction.reference },
          },
        }).catch((e) => { if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Erreur notification:", e.message); });

        if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] Transfert INTERNE REUSSI");
        return { type: "INTERNAL" as const, transaction };
      }

      // Transfert EXTERNE (blockchain) - recipientUser est null a ce point
      let blockchainTxHash: string | null = null;
      let txStatus = TransactionStatus.PENDING;

      if ((currency === "SDA" || currency === "SIDRA") && senderUser?.sidraPrivateKey) {
        try {
          let privateKey = senderUser.sidraPrivateKey;
          
          // Décryption sécurisée avec vérification
          if (privateKey.includes(':')) {
            try {
              const decrypted = decrypt(privateKey);
              if (decrypted && decrypted.length > 0) {
                privateKey = decrypted;
              }
            } catch (decryptError: any) {
              console.error("[v0] Decryption error for SDA key:", decryptError.message);
              throw new Error(`Clé SDA invalide ou corrompue: ${decryptError.message}`);
            }
          }
          
          if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
          
          // Valider format clé EVM (64 caractères hex après 0x)
          if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
            throw new Error("Format de clé SDA/EVM invalide");
          }

          const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
          const wallet = new ethers.Wallet(privateKey, provider);
          const txRes = await wallet.sendTransaction({ to: recipientInput, value: ethers.parseEther(amount.toString()) });
          const receipt = await txRes.wait();
          blockchainTxHash = receipt?.hash || txRes.hash;
          txStatus = TransactionStatus.SUCCESS;
        } catch (e: any) { throw new Error(`Erreur blockchain SDA: ${e.message}`); }
      }

      // Pour les transferts Pi externes vers une adresse Stellar:
      // Les retraits Pi sont traités automatiquement par le worker /api/worker/process
      // qui utilise le master wallet pour envoyer les Pi vers l'adresse externe
      if (currency === "PI") {
        blockchainTxHash = null; // Sera rempli par le worker après broadcast
        txStatus = TransactionStatus.SUCCESS; // SUCCESS + statusClass QUEUED = prêt pour le worker
        
        // Créer une notification pour l'utilisateur
        await tx.notification.create({
          data: {
            userId: senderId,
            title: "Retrait Pi en cours de traitement",
            message: `Votre retrait de ${amount} PI vers ${recipientInput.substring(0, 8)}...${recipientInput.substring(recipientInput.length - 4)} est en file d'attente. Le transfert sera effectué automatiquement.`,
            type: "WITHDRAW_PENDING",
            metadata: { amount, currency, toAddress: recipientInput },
          },
        }).catch(() => {});
      }

      // Description adaptée selon la devise
      const txDescription = currency === "PI" 
        ? `Retrait PI vers adresse externe : ${recipientInput}` 
        : (description || `Retrait ${currency} vers adresse externe : ${recipientInput}`);

      const transaction = await tx.transaction.create({
        data: {
          reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
          amount, fee, netAmount: amount, currency,
          type: TransactionType.WITHDRAW,
          status: txStatus,
          statusClass: "QUEUED", // Pour le worker de traitement blockchain
          blockchainTx: blockchainTxHash,
          fromUserId: senderId,
          fromWalletId: updatedSender.id,
          description: txDescription,
          accountNumber: recipientInput, // Stocker l'adresse pour l'affichage admin
          metadata: currency === "PI" ? { 
            externalAddress: recipientInput, // Pour le worker
            toAddress: recipientInput, 
            network: "Pi Network", 
            pendingWithdrawal: true,
            isBlockchainWithdraw: true,
            requestedAt: new Date().toISOString(),
            // Pour le flux A2U officiel Pi Network
            ...(senderUser?.piUserId && { piUid: senderUser.piUserId }),
            senderUsername: senderUser?.username
          } : {
            externalAddress: recipientInput,
            network: currency,
            isBlockchainWithdraw: true,
            requestedAt: new Date().toISOString()
          },
        },
      });

      return { type: "EXTERNAL" as const, transaction };
    }, { maxWait: 5000, timeout: 20000 });

    // Si c'est un retrait externe Pi, declencher le worker automatiquement
    if (result.type === "EXTERNAL" && result.transaction.currency === "PI") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || "http://localhost:3000";
      
      // Appel asynchrone au worker (fire and forget)
      fetch(`${baseUrl}/api/worker/process`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${process.env.WORKER_SECRET || ""}`,
          "x-internal-request": "true"
        }
      }).then(res => {
        if (res.ok) console.log("[TRANSFER] Worker Pi declenche avec succes");
        else console.error("[TRANSFER] Erreur worker:", res.status);
      }).catch((err) => {
        console.error("[TRANSFER] Erreur appel worker:", err.message);
      });
    }

    if (process.env.NODE_ENV !== "production") console.log("[v0] [USER_TRANSFER] SUCCES:", { mode: result.type, reference: result.transaction.reference });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    if (result.transaction.fee && result.transaction.fee > 0) {
      autoConvertFeeToPi(
        result.transaction.fee,
        result.transaction.currency,
        result.transaction.id,
        result.transaction.reference
      ).catch((err) => {
        console.error("[USER_TRANSFER] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({ success: true, mode: result.type, transaction: result.transaction });
  } catch (error: any) {
    console.error("[v0] [USER_TRANSFER] ERREUR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur" }, { status: 400 });
  }
}
