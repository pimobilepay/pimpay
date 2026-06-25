import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { parseAmount } from "@/lib/amount-guard";
import { enforceTxRateLimit, getClientIp } from "@/lib/tx-rate-limit";

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION — userId provient du token, jamais du body client.
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Authentification requise" }, { status: 401 });
    }

    // 2. RATE LIMITING distribué — 2 req / 60s par utilisateur ET par IP.
    const ip = getClientIp(req);
    const limited = await enforceTxRateLimit({ userId, ip, action: "deposit" });
    if (limited) {
      return NextResponse.json(await limited.json(), {
        status: 429,
        headers: Object.fromEntries(limited.headers),
      });
    }

    const body = await req.json();
    const { currency, phone, operator, countryCode } = body;

    // 3. Validation stricte (montant : anti-négatif / overflow / décimales).
    const parsed = parseAmount(body.amount);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }
    const amount = parsed.value;

    if (!phone || typeof phone !== "string" || !currency || typeof currency !== "string") {
      return NextResponse.json({ success: false, message: "Données manquantes" }, { status: 400 });
    }

    // 4. Récupérer les frais centralisés.
    const feeConfig = await getFeeConfig();
    const { feeAmount: fee } = calculateFee(amount, feeConfig, "deposit_mobile");

    // 5. Vérifier ou créer le Wallet de destination pour CET utilisateur authentifié.
    let wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, currency, balance: 0, type: "FIAT" },
      });
    }

    // 6. Création de la transaction (PENDING). Le crédit réel se fait via le webhook signé.
    const reference = `DEP-MM-${uuidv4().split("-")[0].toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount,
        fee,
        netAmount: amount - fee,
        currency,
        type: "DEPOSIT",
        status: "PENDING",
        description: `Dépôt Mobile Money via ${operator}`,
        operatorId: operator,
        countryCode,
        accountNumber: phone,
        toUserId: userId,
        toWalletId: wallet.id,
        metadata: {
          initiationSource: "PimPay Mobile App",
          phone_used: phone,
        },
      },
    });

    // 7. Log de sécurité (le modèle SecurityLog n'a pas de champ `details`).
    await prisma.securityLog.create({
      data: {
        userId,
        action: `DEPOSIT_INITIATED | ref:${reference} | ${amount} ${currency}`,
        device: req.headers.get("user-agent") || "unknown",
        ip,
      },
    });

    return NextResponse.json({
      success: true,
      reference: transaction.reference,
      message: "Veuillez confirmer le retrait sur votre téléphone.",
    });
  } catch (error) {
    console.error("DEPOSIT_API_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur PimPay" }, { status: 500 });
  }
}
