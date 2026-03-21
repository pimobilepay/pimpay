export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { TransactionStatus, TransactionType } from '@prisma/client';

/**
 * POST /api/mpay/external-transfer
 *
 * Transfert Pi vers un wallet externe en utilisant:
 *   - Mode A2U  : uid fourni => Pi Platform API + blockchain broadcast
 *   - Mode Direct: adresse G... fournie => blockchain broadcast direct
 *
 * Configuration requise (variables d'environnement):
 *   PI_API_KEY              - Cle API Pi Developer Portal (Authorization: Key <PI_API_KEY>)
 *   PI_MASTER_WALLET_ADDRESS - Adresse publique G... du wallet source
 *   PI_MASTER_WALLET_SECRET  - Cle secrete S... du wallet source (NE PAS exposer cote client)
 *   PI_HORIZON_URL          - (optionnel) Par defaut: https://api.mainnet.minepi.com
 *   PI_NETWORK_PASSPHRASE   - (optionnel) Par defaut: "Pi Network"
 */

const PI_API_URL          = "https://api.minepi.com";
const PI_HORIZON_URL      = process.env.PI_HORIZON_URL      || "https://api.mainnet.minepi.com";
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Network";

const PI_API_KEY           = process.env.PI_API_KEY;
const PI_MASTER_ADDRESS    = process.env.PI_MASTER_WALLET_ADDRESS;
const PI_MASTER_SECRET     = process.env.PI_MASTER_WALLET_SECRET;

// ---------------------------------------------------------------------------
// Helper: appel API Pi Platform
// ---------------------------------------------------------------------------
async function piApi(endpoint: string, method: string, body?: unknown) {
  if (!PI_API_KEY) throw new Error("PI_API_KEY non configure");

  const res = await fetch(`${PI_API_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Key ${PI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as any).error_message ||
      (json as any).message ||
      `Pi API ${res.status}: ${JSON.stringify(json)}`
    );
  }
  return json;
}

// ---------------------------------------------------------------------------
// Etape 1 (A2U): creer un paiement sur la Pi Platform
// Retourne: { paymentId, recipientAddress }
// ---------------------------------------------------------------------------
async function a2uCreate(uid: string, amount: number, memo: string, metadata: Record<string, unknown>) {
  const data: any = await piApi("/v2/payments", "POST", {
    payment: { amount, memo: memo.slice(0, 140), metadata, uid },
  });
  return {
    paymentId:        data.identifier        as string,
    recipientAddress: data.recipient_address as string,
  };
}

// ---------------------------------------------------------------------------
// Etape 2: signer et broadcaster la transaction Stellar/Pi
// Retourne: txHash (string)
// ---------------------------------------------------------------------------
async function broadcastPi(toAddress: string, amount: number, memo: string): Promise<string> {
  if (!PI_MASTER_ADDRESS || !PI_MASTER_SECRET) {
    throw new Error("PI_MASTER_WALLET_ADDRESS ou PI_MASTER_WALLET_SECRET non configure");
  }

  if (!StellarSdk.StrKey.isValidEd25519PublicKey(toAddress)) {
    throw new Error(`Adresse Pi invalide: ${toAddress}`);
  }

  const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);

  // Verifier que le compte destinataire existe
  try {
    await server.loadAccount(toAddress);
  } catch (e: any) {
    if (e?.response?.status === 404) {
      throw new Error(
        "Le wallet Pi du destinataire n'est pas encore active. Il doit ouvrir son Pi Wallet au moins une fois."
      );
    }
    throw e;
  }

  // Charger le compte source
  const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS);
  const nativeBal = sourceAccount.balances.find((b: any) => b.asset_type === "native");
  const available = parseFloat(nativeBal?.balance || "0");

  if (available < amount + 0.01) {
    throw new Error(
      `Solde Master Wallet insuffisant: ${available} Pi disponible, ${amount} Pi requis.`
    );
  }

  // Construire la transaction
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: PI_NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(memo.slice(0, 28)))
    .setTimeout(180)
    .build();

  tx.sign(StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET));

  const result = await server.submitTransaction(tx);
  if (!result.successful) {
    const codes = (result as any).extras?.result_codes;
    throw new Error(`Transaction rejetee: ${JSON.stringify(codes || result)}`);
  }

  return result.hash;
}

// ---------------------------------------------------------------------------
// Etape 3 (A2U): notifier la Pi Platform que la transaction est confirmee
// ---------------------------------------------------------------------------
async function a2uComplete(paymentId: string, txHash: string) {
  await piApi(`/v2/payments/${paymentId}/complete`, "POST", { txid: txHash });
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await auth() as any;
  if (!session?.id) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corps JSON invalide" }, { status: 400 });
  }

  const { destination, amount, memo, uid } = body;
  const senderId = session.id;

  // 2. Validation
  const amountNum = parseFloat(amount);
  if (!destination || isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ success: false, error: "Parametres invalides" }, { status: 400 });
  }

  // Check if destination is the literal string "external" (bug from frontend)
  if (destination === "external" || destination === "External") {
    return NextResponse.json({ 
      success: false, 
      error: "Adresse invalide. Veuillez re-entrer l'adresse Pi du destinataire." 
    }, { status: 400 });
  }

  const isPiAddress = /^G[A-Z2-7]{55}$/.test(destination);
  // uid peut venir du body OU destination peut etre un UID Pi (non-adresse)
  const piUid: string | null = uid || (!isPiAddress ? destination : null);

  if (!isPiAddress && !piUid) {
    return NextResponse.json(
      { success: false, error: "Format invalide: fournissez une adresse Pi (G...) ou un UID Pi." },
      { status: 400 }
    );
  }

  // 3. Verifier la configuration
  const canA2U    = !!PI_API_KEY && !!PI_MASTER_ADDRESS && !!PI_MASTER_SECRET;
  const canDirect = !!PI_MASTER_ADDRESS && !!PI_MASTER_SECRET;

  if (!canA2U && !canDirect) {
    return NextResponse.json(
      { success: false, error: "Service de retrait non configure (PI_API_KEY, PI_MASTER_WALLET_ADDRESS, PI_MASTER_WALLET_SECRET requis)." },
      { status: 503 }
    );
  }

  // 4. Frais et verification de solde
  let fee = 0;
  let totalDeduction = amountNum;
  try {
    const feeConfig = await getFeeConfig();
    const calc = calculateFee(amountNum, feeConfig, "withdraw");
    fee           = calc.feeAmount;
    totalDeduction = calc.totalDebit;
  } catch {
    // si getFeeConfig echoue, on continue sans frais supplementaires
  }

  const senderWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: senderId, currency: "PI" } },
  });

  if (!senderWallet || senderWallet.balance < totalDeduction) {
    return NextResponse.json(
      { success: false, error: `Solde insuffisant. Requis: ${totalDeduction.toFixed(4)} Pi` },
      { status: 400 }
    );
  }

  // 5. Creer la transaction DB et debiter le wallet (atomique)
  const txRef = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const memoText = memo || `Retrait PimPay ${txRef.slice(-8)}`;

  const [dbTx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        reference:    txRef,
        amount:       amountNum,
        fee:          fee,
        netAmount:    amountNum,
        type:         TransactionType.WITHDRAW,
        status:       TransactionStatus.PENDING,
        statusClass:  "PROCESSING",
        description:  `Retrait Pi: ${isPiAddress ? destination.slice(0, 10) + "..." : piUid}`,
        fromUserId:   senderId,
        toUserId:     null,
        fromWalletId: senderWallet.id,
        toWalletId:   null,
        currency:     "PI",
        metadata: {
          externalAddress: isPiAddress ? destination : null,
          piUid:           piUid,
          transferType:    piUid && canA2U ? "A2U" : "DIRECT",
          network:         PI_NETWORK_PASSPHRASE,
          startedAt:       new Date().toISOString(),
        },
      },
    }),
    prisma.wallet.update({
      where: { id: senderWallet.id },
      data:  { balance: { decrement: totalDeduction } },
    }),
  ]);

  // 6. Executer le transfert
  let blockchainTxHash: string | null = null;
  let piPaymentId:      string | null = null;
  let recipientAddress:  string       = isPiAddress ? destination : "";
  let transferError:    string | null = null;

  try {
    if (piUid && canA2U) {
      // --- Mode A2U ---
      // a) Creer le paiement sur la Pi Platform => recuperer l'adresse du destinataire
      const a2u = await a2uCreate(
        piUid,
        amountNum,
        memoText,
        { pimpayRef: txRef, senderId }
      );
      piPaymentId      = a2u.paymentId;
      recipientAddress = a2u.recipientAddress;

      // b) Broadcaster la transaction blockchain
      blockchainTxHash = await broadcastPi(recipientAddress, amountNum, memoText);

      // c) Notifier la Pi Platform
      await a2uComplete(piPaymentId, blockchainTxHash);

    } else if (isPiAddress && canDirect) {
      // --- Mode Direct ---
      blockchainTxHash = await broadcastPi(destination, amountNum, memoText);

    } else {
      throw new Error("Mode de transfert non disponible avec la configuration actuelle.");
    }
  } catch (err: any) {
    transferError = err.message;
    console.error("[EXTERNAL_TRANSFER] Erreur:", err);
  }

  // 7. Mettre a jour la transaction DB
  if (blockchainTxHash) {
    // Succes
    await prisma.transaction.update({
      where: { id: dbTx.id },
      data: {
        status:      TransactionStatus.SUCCESS,
        statusClass: "BROADCASTED",
        blockchainTx: blockchainTxHash,
        metadata: {
          ...(dbTx.metadata as object),
          piPaymentId,
          recipientAddress,
          blockchainTxHash,
          completedAt: new Date().toISOString(),
        },
      },
    });

    // Stats globales
    await prisma.systemConfig.upsert({
      where:  { id: "GLOBAL_CONFIG" },
      update: { totalVolumePi: { increment: amountNum }, totalProfit: { increment: fee } },
      create: { id: "GLOBAL_CONFIG", totalVolumePi: amountNum, totalProfit: fee },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Transfert Pi reussi!",
      data: {
        txid:            txRef,
        blockchainTxHash,
        piPaymentId,
        status:          "BROADCASTED",
        amount:          amountNum,
        fee,
        destination:     recipientAddress || destination,
        explorerUrl:     `https://blockexplorer.minepi.com/tx/${blockchainTxHash}`,
      },
    });
  } else {
    // Echec - rembourser
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: dbTx.id },
        data: {
          status:      TransactionStatus.FAILED,
          statusClass: "FAILED",
          metadata: {
            ...(dbTx.metadata as object),
            error:    transferError,
            failedAt: new Date().toISOString(),
          },
        },
      }),
      prisma.wallet.update({
        where: { id: senderWallet.id },
        data:  { balance: { increment: totalDeduction } },
      }),
    ]);

    return NextResponse.json(
      { success: false, error: transferError || "Echec du transfert. Votre solde a ete restaure." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET: statut du service de retrait
// ---------------------------------------------------------------------------
export async function GET() {
  const configured = !!PI_API_KEY && !!PI_MASTER_ADDRESS && !!PI_MASTER_SECRET;
  let masterBalance: string | null = null;

  if (PI_MASTER_ADDRESS && PI_MASTER_SECRET) {
    try {
      const server  = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
      const account = await server.loadAccount(PI_MASTER_ADDRESS);
      const bal     = account.balances.find((b: any) => b.asset_type === "native");
      masterBalance = bal?.balance ?? null;
    } catch {
      masterBalance = null;
    }
  }

  return NextResponse.json({
    available:     configured,
    network:       PI_NETWORK_PASSPHRASE?.includes("Testnet") ? "testnet" : "mainnet",
    masterBalance,
    modes: {
      a2u:    !!PI_API_KEY,
      direct: !!PI_MASTER_ADDRESS && !!PI_MASTER_SECRET,
    },
    minWithdraw:   1,
    estimatedTime: "1-3 minutes",
  });
}
