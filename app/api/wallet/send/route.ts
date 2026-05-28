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
    console.log("[v0] [WALLET_SEND] Debut du traitement...");
    
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      console.log("[v0] [WALLET_SEND] Erreur: Non authentifie");
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // 1. AUTHENTIFICATION via JWT (lib/auth)
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    const senderId = payload.id;

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const currency = (body.currency || "PI").toUpperCase();
    // Support multiple input names: address, recipientIdentifier, recipient
    const recipientInput = (body.address || body.recipientIdentifier || body.recipient || "").trim();

    console.log("[v0] [WALLET_SEND] Params:", { amount, currency, recipientInput: recipientInput.substring(0, 20) + "..." });

    // Minimum de 0.00000001 pour les cryptos
    const MIN_CRYPTO_AMOUNT = 0.00000001;
    
    if (!recipientInput || isNaN(amount) || amount < MIN_CRYPTO_AMOUNT) {
      console.log("[v0] [WALLET_SEND] Erreur: Donnees invalides", { recipientInput, amount });
      return NextResponse.json({ error: `Montant minimum: ${MIN_CRYPTO_AMOUNT}` }, { status: 400 });
    }

    // Validation d'adresse selon la devise
    const validateAddress = (addr: string, curr: string): boolean => {
      if (!addr || addr.length < 3) return false;
      
      // Pi Network: adresse Stellar (G... 56 chars) OU piUserId
      if (curr === "PI") {
        return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3; // piUserId peut être court
      }
      
      // SDA/Sidra: adresse EVM (0x... 42 chars)
      if (curr === "SDA" || curr === "SIDRA") {
        return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      }
      
      // USDT TRC20: adresse TRON (T... 34 chars)
      if (curr === "USDT") {
        return /^T[a-zA-Z0-9]{33}$/.test(addr) || addr.length >= 3;
      }
      
      // Bitcoin: legacy/bech32
      if (curr === "BTC") {
        return /^[13bc1][a-km-zA-HJ-NP-Z1-9]{25,62}$/.test(addr) || addr.length >= 3;
      }
      
      // Ethereum & autres EVM
      if (["ETH", "BNB", "USDC", "DAI", "BUSD"].includes(curr)) {
        return /^0x[a-fA-F0-9]{40}$/.test(addr) || addr.length >= 3;
      }
      
      // Stellar/XLM
      if (curr === "XLM") {
        return /^G[A-Z2-7]{55}$/.test(addr) || addr.length >= 3;
      }
      
      // XRP
      if (curr === "XRP") {
        return /^r[a-zA-Z0-9]{24,33}$/.test(addr) || addr.length >= 3;
      }
      
      // Solana
      if (curr === "SOL") {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) || addr.length >= 3;
      }
      
      // Par défaut: accepter si c'est >= 3 caractères (username, email)
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

      // B. RECHERCHE DU DESTINATAIRE (Interne vs Externe)
      // On nettoie l'input si c'est un @username
      const cleanInput = recipientInput.startsWith('@') ? recipientInput.substring(1) : recipientInput;

      // Déterminer si c'est une adresse Stellar/Pi (commence par G, 56 chars)
      const isStellarAddress = /^G[A-Z2-7]{55}$/.test(cleanInput);
      // Déterminer si c'est une adresse EVM/SDA (commence par 0x, 42 chars)
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

      // --- SCENARIO 1 : TRANSFERT INTERNE (ENTRE MEMBRES PIMPAY) ---
      if (recipientUser) {
        console.log("[v0] [WALLET_SEND] Transfert INTERNE vers:", recipientUser.id);
        if (recipientUser.id === senderId) throw new Error("Vous ne pouvez pas vous envoyer des fonds a vous-meme.");

        // Déterminer le type de wallet selon la monnaie
        const getWalletType = (curr: string): WalletType => {
          if (curr === "PI") return WalletType.PI;
          if (curr === "SDA") return WalletType.SIDRA;
          if (["XAF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
          return WalletType.CRYPTO;
        };

        // Crédit du destinataire (Upsert pour créer le wallet s'il n'existe pas encore)
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

        // Log de transaction SUCCESS (Immédiat)
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

        // Notification asynchrone pour le destinataire
        await tx.notification.create({
          data: {
            userId: recipientUser.id,
            title: "Fonds reçus ! 💸",
            message: `Vous avez reçu ${amount} ${currency} de la part d'un membre PimPay.`,
            type: "payment_received"
          }
}).catch((e) => console.log("[v0] [WALLET_SEND] Erreur notification:", e.message));
      
      console.log("[v0] [WALLET_SEND] Transaction INTERNE REUSSIE:", transaction.reference);
      return { type: 'INTERNAL', transaction };
      }

      // --- SCENARIO 2 : RETRAIT EXTERNE (VERS BLOCKCHAIN) ---
      else {
        console.log("[v0] [WALLET_SEND] Transfert EXTERNE vers adresse:", recipientInput);
        
        // Recuperer l'utilisateur avec ses cles privees pour broadcast direct
        const senderUser = await tx.user.findUnique({
          where: { id: senderId },
          select: { 
            piUserId: true, 
            username: true,
            sidraAddress: true,
            sidraPrivateKey: true
          }
        });

        let blockchainTxHash: string | null = null;
        let txStatus = TransactionStatus.SUCCESS;

// --- BROADCAST DIRECT POUR SDA/SIDRA ---
        // Stratégie : 
        //   1. Essayer le wallet opérateur central (SIDRA_OPERATOR_PRIVATE_KEY)
        //   2. Si solde opérateur insuffisant, utiliser le wallet personnel de l'utilisateur
        if ((currency === "SDA" || currency === "SIDRA")) {
          const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
          const amountStr = amount.toFixed(18).replace(/\.?0+$/, '');
          const amountInWei = ethers.parseEther(amountStr);
          
          // Estimer le gas
          let gasLimit = BigInt(21000);
          let gasPrice = ethers.parseUnits("1", "gwei");
          try {
            const feeData = await provider.getFeeData();
            if (feeData.gasPrice) gasPrice = feeData.gasPrice;
          } catch { /* garder les valeurs par défaut */ }
          
          const totalNeeded = amountInWei + gasLimit * gasPrice;
          
          // Support pour les deux noms de variable (compatibilite)
          const operatorPrivateKey = process.env.SIDRA_OPERATOR_PRIVATE_KEY || process.env.SDA_OPERATOR_PRIVATE_KEY;
          
          let usedOperator = false;
          let operatorBalanceStr = "N/A";
          
          // — Tentative 1 : wallet opérateur central
          if (operatorPrivateKey) {
            try {
              let privateKey = operatorPrivateKey;
              if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
              
              if (/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
                const operatorWallet = new ethers.Wallet(privateKey, provider);
                const operatorBalance = await provider.getBalance(operatorWallet.address);
                operatorBalanceStr = parseFloat(ethers.formatEther(operatorBalance)).toFixed(6);
                
                if (operatorBalance >= totalNeeded) {
                  console.log("[v0] [WALLET_SEND] Broadcasting SDA via OPERATOR wallet...");
                  const txRes = await operatorWallet.sendTransaction({ 
                    to: recipientInput, 
                    value: amountInWei,
                    gasLimit,
                    gasPrice
                  });
                  const receipt = await txRes.wait();
                  blockchainTxHash = receipt?.hash || txRes.hash;
                  usedOperator = true;
                  txStatus = TransactionStatus.SUCCESS;
                  console.log("[v0] [WALLET_SEND] SDA confirmed via OPERATOR:", blockchainTxHash);
                } else {
                  console.log("[v0] [WALLET_SEND] Solde operateur insuffisant:", operatorBalanceStr, "SDA. Tentative wallet utilisateur...");
                }
              }
            } catch (e: any) {
              console.error("[v0] [WALLET_SEND] Erreur wallet operateur:", e.message);
            }
          }
          
          // — Tentative 2 : wallet personnel de l'utilisateur (fallback)
          if (!usedOperator && !blockchainTxHash) {
            if (!senderUser?.sidraPrivateKey || !senderUser?.sidraAddress) {
              // Rembourser l'utilisateur
              await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { increment: amount } }
              });
              throw new Error(
                `Transfert annulé : Solde opérateur SDA insuffisant (${operatorBalanceStr} SDA). Contactez le support.. Votre solde a été restitué.`
              );
            }
            
            try {
              let privateKey = senderUser.sidraPrivateKey;
              // Déchiffrer si nécessaire
              if (privateKey.includes(":")) privateKey = decrypt(privateKey);
              if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
              
              if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
                throw new Error("Format de clé SDA utilisateur invalide");
              }
              
              const userWallet = new ethers.Wallet(privateKey, provider);
              const userOnChainBalance = await provider.getBalance(userWallet.address);
              
              if (userOnChainBalance < totalNeeded) {
                const availUser = parseFloat(ethers.formatEther(userOnChainBalance)).toFixed(6);
                const neededStr = parseFloat(ethers.formatEther(totalNeeded)).toFixed(6);
                // Rembourser l'utilisateur
                await tx.wallet.update({
                  where: { id: senderWallet.id },
                  data: { balance: { increment: amount } }
                });
                throw new Error(
                  `Transfert annulé : Solde opérateur SDA insuffisant (${operatorBalanceStr} SDA) ` +
                  `et votre solde on-chain est également insuffisant (${availUser} SDA disponible, ${neededStr} SDA requis). ` +
                  `Votre solde a été restitué.`
                );
              }
              
              console.log("[v0] [WALLET_SEND] Broadcasting SDA via USER wallet:", userWallet.address);
              const txRes = await userWallet.sendTransaction({ 
                to: recipientInput, 
                value: amountInWei,
                gasLimit,
                gasPrice
              });
              const receipt = await txRes.wait();
              blockchainTxHash = receipt?.hash || txRes.hash;
              txStatus = TransactionStatus.SUCCESS;
              console.log("[v0] [WALLET_SEND] SDA confirmed via USER wallet:", blockchainTxHash);
            } catch (e: any) {
              console.error("[v0] [WALLET_SEND] Erreur wallet utilisateur:", e.message);
              // Rembourser l'utilisateur en cas d'echec blockchain
              await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { increment: amount } }
              });
              throw new Error(`Erreur transfert SDA: ${e.message}`);
            }
          }
        }

          try {
            let privateKey = operatorPrivateKey;
            
            if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
            
            // Valider format clé EVM (64 caractères hex après 0x)
            if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
              throw new Error("Format de clé operateur SDA/EVM invalide");
            }

            console.log("[v0] [WALLET_SEND] Broadcasting SDA transaction via OPERATOR wallet...");
            const provider = new ethers.JsonRpcProvider(RPC_URLS.SDA);
            const wallet = new ethers.Wallet(privateKey, provider);
            
            // Verifier le solde du wallet operateur
            const operatorBalance = await provider.getBalance(wallet.address);
            const operatorBalanceEth = parseFloat(ethers.formatEther(operatorBalance));
            
            if (operatorBalanceEth < amount) {
              console.error("[v0] [WALLET_SEND] Solde operateur insuffisant:", operatorBalanceEth, "< montant:", amount);
              throw new Error(`Liquidite operateur insuffisante. Solde: ${operatorBalanceEth.toFixed(4)} SDA`);
            }
            
            // Fix: Convert amount to fixed-point string to avoid scientific notation (e.g. 1e-8)
            const amountStr = amount.toFixed(18).replace(/\.?0+$/, '');
            const txRes = await wallet.sendTransaction({ 
              to: recipientInput, 
              value: ethers.parseEther(amountStr) 
            });
            const receipt = await txRes.wait();
            blockchainTxHash = receipt?.hash || txRes.hash;
            txStatus = TransactionStatus.SUCCESS;
            console.log("[v0] [WALLET_SEND] SDA transaction confirmed via OPERATOR:", blockchainTxHash);
          } catch (e: any) { 
            console.error("[v0] [WALLET_SEND] SDA blockchain error:", e.message);
            // Rembourser l'utilisateur en cas d'echec blockchain
            await tx.wallet.update({
              where: { id: senderWallet.id },
              data: { balance: { increment: amount } }
            });
            throw new Error(`Erreur blockchain SDA: ${e.message}`); 
          }
        }
        
        // Log de transaction
        const transaction = await tx.transaction.create({
          data: {
            reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
            amount,
            currency,
            type: TransactionType.WITHDRAW,
            status: txStatus,
            statusClass: blockchainTxHash ? undefined : "QUEUED", // QUEUED si pas encore broadcast
            blockchainTx: blockchainTxHash, // Hash si broadcast direct
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

        console.log("[v0] [WALLET_SEND] Transaction EXTERNE creee:", transaction.reference, blockchainTxHash ? `(broadcast: ${blockchainTxHash})` : "(queued)");
        return { type: 'EXTERNAL', transaction, blockchainTx: blockchainTxHash };
      }

}, { maxWait: 10000, timeout: 30000 });
    
    console.log("[v0] [WALLET_SEND] SUCCES:", { mode: result.type, reference: result.transaction.reference, blockchainTx: result.blockchainTx });
    
    const isDirectBlockchainTransfer = result.type === 'EXTERNAL' && result.blockchainTx;
    
    return NextResponse.json({
      success: true,
      mode: result.type,
      message: result.type === 'INTERNAL' 
        ? "Transfert instantane reussi" 
        : (isDirectBlockchainTransfer ? "Transfert blockchain confirme" : "Retrait blockchain enregistre (en attente)"),
      reference: result.transaction.reference,
      transaction: result.transaction,
      blockchainTx: result.blockchainTx || null
    });

  } catch (error: any) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("[v0] [WALLET_SEND] ERREUR:", error.message);
    // Seuls les messages métier sûrs sont renvoyés (solde insuffisant, etc.)
    const safeErrors = ["Solde", "insuffisant", "invalide", "vous-meme", "Cle"];
    const isSafeError = safeErrors.some(e => error.message?.includes(e));
    return NextResponse.json({ 
      error: isSafeError ? error.message : "Erreur lors du transfert" 
    }, { status: 400 });
  }
}
