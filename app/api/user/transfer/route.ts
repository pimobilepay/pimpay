export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from "nanoid";

type DetectedNetwork =
  | "STELLAR_LIKE"
  | "EVM"
  | "TRON"
  | "XRP"
  | "SOLANA"
  | "BTC"
  | "LTC"
  | null;

function detectExternalAddress(identifier: string): {
  isExternal: boolean;
  network: DetectedNetwork;
  networkLabel: string | null;
} {
  const clean = identifier.trim();
  if (!clean || clean.length < 20) {
    return { isExternal: false, network: null, networkLabel: null };
  }

  if (/^G[A-Z2-7]{55}$/.test(clean)) {
    return { isExternal: true, network: "STELLAR_LIKE", networkLabel: "Stellar/Pi (G...)" };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return { isExternal: true, network: "EVM", networkLabel: "EVM (0x...)" };
  }
  if (/^T[a-zA-Z0-9]{33}$/.test(clean)) {
    return { isExternal: true, network: "TRON", networkLabel: "TRON (T...)" };
  }
  if (/^r[a-zA-Z0-9]{24,33}$/.test(clean)) {
    return { isExternal: true, network: "XRP", networkLabel: "XRP Ledger (r...)" };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return { isExternal: true, network: "SOLANA", networkLabel: "Solana" };
  }
  if (
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean) ||
    /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(clean)
  ) {
    return { isExternal: true, network: "BTC", networkLabel: "Bitcoin" };
  }
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(clean)) {
    return { isExternal: true, network: "LTC", networkLabel: "Litecoin" };
  }

  return { isExternal: false, network: null, networkLabel: null };
}

function getWalletType(currency: string): WalletType {
  const c = currency.toUpperCase();
  if (c === "PI") return WalletType.PI;
  if (c === "SDA" || c === "SIDRA") return WalletType.SIDRA;
  if (["XAF", "USD", "EUR", "CDF"].includes(c)) return WalletType.FIAT;
  return WalletType.CRYPTO;
}

function resolveCurrencyByNetwork(inputCurrency: string, network: DetectedNetwork) {
  const c = (inputCurrency || "XAF").toUpperCase();
  if (c === "USDT" || c === "USDT-ERC20") {
    if (network === "TRON") return "USDT";
    if (network === "EVM") return "USDT-ERC20";
    return c;
  }
  return c;
}

function isFiat(currency: string) {
  return ["XAF", "USD", "EUR", "CDF"].includes(currency.toUpperCase());
}

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;

    // ✅ ICI: cookies synchrones via NextRequest
    const cookieStore = req.cookies;
    const token =
      cookieStore.get("token")?.value ??
      cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.id as string;

    const body = await req.json();

    const recipientIdentifier = String(body.recipientIdentifier || "").trim();
    const description = String(body.description || "").trim();

    const amountRaw = body.amount;
    const transferAmount =
      typeof amountRaw === "number" ? amountRaw : parseFloat(String(amountRaw));

    if (!recipientIdentifier) throw new Error("Destinataire requis.");
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      throw new Error("Montant invalide.");
    }

    const cleanIdentifier = recipientIdentifier.replace(/^@/, "");

    const externalCheck = detectExternalAddress(cleanIdentifier);

    const requestedCurrency = String(body.currency || "XAF");
    const transferCurrency = resolveCurrencyByNetwork(
      requestedCurrency,
      externalCheck.network
    );

    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { transactionFee: true },
    });
    const fee = config?.transactionFee ?? 0.01;

    const totalDebit = transferAmount + fee;

    if (isFiat(transferCurrency) && externalCheck.isExternal) {
      throw new Error("Retrait externe impossible pour une devise FIAT.");
    }

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanIdentifier, mode: "insensitive" } },
          { email: { equals: cleanIdentifier, mode: "insensitive" } },
          { phone: cleanIdentifier },
          { walletAddress: cleanIdentifier },
          { sidraAddress: cleanIdentifier },
          { usdtAddress: cleanIdentifier },
          { xrpAddress: cleanIdentifier },
          { xlmAddress: cleanIdentifier },
          { solAddress: cleanIdentifier },
          { wallets: { some: { depositMemo: cleanIdentifier } } },
        ],
      },
      select: { id: true, username: true },
    });

    const result = await prisma.$transaction(
      async (tx) => {
        const senderWallet = await tx.wallet.findUnique({
          where: {
            userId_currency: { userId: senderId, currency: transferCurrency },
          },
        });

        if (!senderWallet) {
          throw new Error(`Wallet ${transferCurrency} introuvable.`);
        }

        const debited = await tx.wallet.updateMany({
          where: {
            id: senderWallet.id,
            balance: { gte: totalDebit },
          },
          data: {
            balance: { decrement: totalDebit },
          },
        });

        if (debited.count === 0) {
          throw new Error(`Solde ${transferCurrency} insuffisant (montant + frais).`);
        }

        if (externalCheck.isExternal && !recipient) {
          return await tx.transaction.create({
            data: {
              reference: `PIM-EXT-${nanoid(10).toUpperCase()}`,
              amount: transferAmount,
              fee,
              netAmount: transferAmount,
              currency: transferCurrency,
              type: TransactionType.WITHDRAW,
              status: TransactionStatus.SUCCESS,
              fromUserId: senderId,
              fromWalletId: senderWallet.id,
              description:
                description ||
                `Retrait ${transferCurrency} vers ${externalCheck.networkLabel || "réseau externe"}`,
              metadata: {
                isExternal: true,
                externalAddress: cleanIdentifier,
                detectedNetwork: externalCheck.network,
                networkLabel: externalCheck.networkLabel,
                totalDebit,
                requestedCurrency: requestedCurrency.toUpperCase(),
                resolvedCurrency: transferCurrency,
              },
            },
          });
        }

        if (!recipient) {
          throw new Error("Identifiant introuvable.");
        }
        if (recipient.id === senderId) {
          throw new Error("Impossible d'envoyer à soi-même.");
        }

        const recipientWallet = await tx.wallet.upsert({
          where: {
            userId_currency: { userId: recipient.id, currency: transferCurrency },
          },
          update: { balance: { increment: transferAmount } },
          create: {
            userId: recipient.id,
            currency: transferCurrency,
            balance: transferAmount,
            type: getWalletType(transferCurrency),
          },
        });

        return await tx.transaction.create({
          data: {
            reference: `PIM-TR-${nanoid(10).toUpperCase()}`,
            amount: transferAmount,
            fee,
            netAmount: transferAmount,
            currency: transferCurrency,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            fromWalletId: senderWallet.id,
            toUserId: recipient.id,
            toWalletId: recipientWallet.id,
            description:
              description ||
              `Transfert de ${senderWallet.currency} à ${recipient.username || "Utilisateur"}`,
            metadata: {
              isExternal: false,
              totalDebit,
              requestedCurrency: requestedCurrency.toUpperCase(),
              resolvedCurrency: transferCurrency,
            },
          },
        });
      },
      { timeout: 20000 }
    );

    return NextResponse.json({ success: true, transaction: result });
  } catch (error: any) {
    console.error("ERREUR TRANSFERT:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Erreur" },
      { status: 400 }
    );
  }
}
