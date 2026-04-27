export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { logSystemEvent, logApiError } from '@/lib/systemLogger';

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
async function piApi(endpoint: string, method: string, body?: unknown, requestId?: string) {
  if (!PI_API_KEY) throw new Error("PI_API_KEY non configure");

  const startTime = Date.now();
  
  await logSystemEvent({
    level: "DEBUG",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "PI_API_CALL_START",
    message: `Appel API Pi: ${method} ${endpoint}`,
    details: { endpoint, method, body, requestId },
    requestId,
  });

  const res = await fetch(`${PI_API_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Key ${PI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  const duration = Date.now() - startTime;
  
  await logSystemEvent({
    level: res.ok ? "INFO" : "ERROR",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "PI_API_RESPONSE",
    message: res.ok 
      ? `API Pi OK: ${endpoint}` 
      : `API Pi ERREUR ${res.status}: ${(json as any).error_message || (json as any).message || 'Unknown'}`,
    details: { 
      endpoint, 
      method, 
      status: res.status, 
      ok: res.ok, 
      response: json,
      requestId,
    },
    duration,
    requestId,
  });
  
  if (!res.ok) {
    const errorMsg = (json as any).error_message ||
      (json as any).message ||
      `Pi API ${res.status}: ${JSON.stringify(json)}`;
    throw new Error(errorMsg);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Etape 1 (A2U): creer un paiement sur la Pi Platform
// Retourne: { paymentId, recipientAddress }
// ---------------------------------------------------------------------------
async function a2uCreate(uid: string, amount: number, memo: string, metadata: Record<string, unknown>, requestId?: string) {
  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "A2U_CREATE_START",
    message: `Demarrage A2U pour UID: ${uid}, montant: ${amount} Pi`,
    details: { uid, amount, memo, metadata },
    requestId,
  });

  const data: any = await piApi("/v2/payments", "POST", {
    payment: { amount, memo: memo.slice(0, 140), metadata, uid },
  }, requestId);

  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "A2U_CREATE_SUCCESS",
    message: `Paiement A2U cree: ${data.identifier}`,
    details: { paymentId: data.identifier, recipientAddress: data.recipient_address },
    requestId,
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
async function broadcastPi(toAddress: string, amount: number, memo: string, requestId?: string): Promise<string> {
  const startTime = Date.now();
  
  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "BROADCAST_START",
    message: `Demarrage broadcast Pi vers ${toAddress.slice(0, 8)}...${toAddress.slice(-4)}`,
    details: { toAddress, amount, memo },
    requestId,
  });

  if (!PI_MASTER_ADDRESS || !PI_MASTER_SECRET) {
    throw new Error("PI_MASTER_WALLET_ADDRESS ou PI_MASTER_WALLET_SECRET non configure");
  }

  if (!StellarSdk.StrKey.isValidEd25519PublicKey(toAddress)) {
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "INVALID_ADDRESS",
      message: `Adresse Pi invalide: ${toAddress}`,
      details: { toAddress },
      requestId,
    });
    throw new Error(`Adresse Pi invalide: ${toAddress}`);
  }

  const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);

  // Verifier que le compte destinataire existe
  try {
    await server.loadAccount(toAddress);
    await logSystemEvent({
      level: "DEBUG",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "RECIPIENT_VERIFIED",
      message: `Compte destinataire verifie: ${toAddress.slice(0, 8)}...`,
      requestId,
    });
  } catch (e: any) {
    if (e?.response?.status === 404) {
      await logSystemEvent({
        level: "ERROR",
        source: "MPAY_EXTERNAL_TRANSFER",
        action: "RECIPIENT_NOT_ACTIVATED",
        message: "Le wallet Pi du destinataire n'est pas encore active",
        details: { toAddress, error: e.message },
        requestId,
      });
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

  await logSystemEvent({
    level: "DEBUG",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "MASTER_WALLET_BALANCE",
    message: `Solde Master Wallet: ${available} Pi`,
    details: { available, required: amount + 0.01 },
    requestId,
  });

  if (available < amount + 0.01) {
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "INSUFFICIENT_MASTER_BALANCE",
      message: `Solde Master Wallet insuffisant: ${available} Pi disponible, ${amount} Pi requis`,
      details: { available, required: amount },
      requestId,
    });
    throw new Error(
      `Solde Master Wallet insuffisant: ${available} Pi disponible, ${amount} Pi requis.`
    );
  }

  // Récupérer les frais de base actuels du réseau avec un multiplicateur de sécurité
  let dynamicFee: string;
  try {
    const baseFee = await server.fetchBaseFee();
    // Utiliser 3x les frais de base pour garantir la confirmation, minimum 5000 stroops
    dynamicFee = String(Math.max(baseFee * 3, 5000));
    await logSystemEvent({
      level: "DEBUG",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "FEE_CALCULATED",
      message: `Frais dynamiques calcules: ${dynamicFee} stroops (base: ${baseFee})`,
      details: { baseFee, dynamicFee },
      requestId,
    });
  } catch (feeError: any) {
    // Fallback vers des frais fixes élevés si fetchBaseFee échoue
    dynamicFee = "10000"; // 10000 stroops = 0.001 Pi
    await logSystemEvent({
      level: "WARN",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "FEE_FETCH_FAILED",
      message: `Echec fetchBaseFee, utilisation fallback: ${dynamicFee} stroops`,
      details: { error: feeError.message },
      requestId,
    });
  }

  // Construire la transaction avec les frais dynamiques
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: dynamicFee,
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
  const duration = Date.now() - startTime;
  
  if (!result.successful) {
    const codes = (result as any).extras?.result_codes;
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "BROADCAST_REJECTED",
      message: `Transaction rejetee par le reseau`,
      details: { codes, result },
      duration,
      requestId,
    });
    throw new Error(`Transaction rejetee: ${JSON.stringify(codes || result)}`);
  }

  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "BROADCAST_SUCCESS",
    message: `Transaction Pi diffusee avec succes: ${result.hash}`,
    details: { txHash: result.hash, toAddress, amount },
    duration,
    requestId,
  });

  return result.hash;
}

// ---------------------------------------------------------------------------
// Etape 3 (A2U): notifier la Pi Platform que la transaction est confirmee
// ---------------------------------------------------------------------------
async function a2uComplete(paymentId: string, txHash: string, requestId?: string) {
  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "A2U_COMPLETE_START",
    message: `Completion A2U paiement: ${paymentId}`,
    details: { paymentId, txHash },
    requestId,
  });

  await piApi(`/v2/payments/${paymentId}/complete`, "POST", { txid: txHash }, requestId);

  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "A2U_COMPLETE_SUCCESS",
    message: `Paiement A2U complete avec succes`,
    details: { paymentId, txHash },
    requestId,
  });
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const requestId = `EXT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // 1. Auth
  const session = await auth() as any;
  if (!session?.id) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    await logSystemEvent({
      level: "WARN",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "INVALID_JSON",
      message: "Corps JSON invalide recu",
      requestId,
    });
    return NextResponse.json({ success: false, error: "Corps JSON invalide" }, { status: 400 });
  }

  const { destination, amount, memo, uid } = body;
  const senderId = session.id;

  // Log initial de la requete
  await logSystemEvent({
    level: "INFO",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "TRANSFER_REQUEST",
    message: `Nouvelle demande de transfert externe: ${amount} Pi`,
    details: { 
      destination: destination?.slice?.(0, 20) || destination, 
      amount, 
      memo, 
      uid,
      hasUid: !!uid,
    },
    userId: senderId,
    requestId,
  });

  // 2. Validation
  const amountNum = parseFloat(amount);
  if (!destination || isNaN(amountNum) || amountNum <= 0) {
    await logSystemEvent({
      level: "WARN",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "VALIDATION_FAILED",
      message: `Parametres invalides: destination=${destination}, amount=${amount}`,
      details: { destination, amount, amountNum },
      userId: senderId,
      requestId,
    });
    return NextResponse.json({ success: false, error: "Parametres invalides" }, { status: 400 });
  }

  // Check if destination is the literal string "external" (bug from frontend)
  if (destination === "external" || destination === "External") {
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "INVALID_DESTINATION_LITERAL",
      message: `Destination litterale "external" detectee - bug frontend probable`,
      details: { destination, body },
      userId: senderId,
      requestId,
    });
    return NextResponse.json({ 
      success: false, 
      error: "Adresse invalide. Veuillez re-entrer l'adresse Pi du destinataire." 
    }, { status: 400 });
  }

  const isPiAddress = /^G[A-Z2-7]{55}$/.test(destination);
  // uid peut venir du body OU destination peut etre un UID Pi (non-adresse)
  const piUid: string | null = uid || (!isPiAddress ? destination : null);

  await logSystemEvent({
    level: "DEBUG",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "ADDRESS_DETECTION",
    message: `Detection adresse: isPiAddress=${isPiAddress}, piUid=${piUid ? 'oui' : 'non'}`,
    details: { isPiAddress, piUid, destination },
    userId: senderId,
    requestId,
  });

  if (!isPiAddress && !piUid) {
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "INVALID_FORMAT",
      message: `Format invalide: ni adresse G... ni UID Pi`,
      details: { destination },
      userId: senderId,
      requestId,
    });
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
      await logSystemEvent({
        level: "INFO",
        source: "MPAY_EXTERNAL_TRANSFER",
        action: "MODE_A2U_START",
        message: `Demarrage transfert mode A2U pour UID: ${piUid}`,
        details: { piUid, amount: amountNum, txRef },
        userId: senderId,
        requestId,
      });
      
      // a) Creer le paiement sur la Pi Platform => recuperer l'adresse du destinataire
      const a2u = await a2uCreate(
        piUid,
        amountNum,
        memoText,
        { pimpayRef: txRef, senderId },
        requestId
      );
      piPaymentId      = a2u.paymentId;
      recipientAddress = a2u.recipientAddress;

      // b) Broadcaster la transaction blockchain
      blockchainTxHash = await broadcastPi(recipientAddress, amountNum, memoText, requestId);

      // c) Notifier la Pi Platform
      await a2uComplete(piPaymentId, blockchainTxHash, requestId);

    } else if (isPiAddress && canDirect) {
      // --- Mode Direct ---
      await logSystemEvent({
        level: "INFO",
        source: "MPAY_EXTERNAL_TRANSFER",
        action: "MODE_DIRECT_START",
        message: `Demarrage transfert mode DIRECT vers ${destination.slice(0, 8)}...`,
        details: { destination, amount: amountNum, txRef },
        userId: senderId,
        requestId,
      });
      
      blockchainTxHash = await broadcastPi(destination, amountNum, memoText, requestId);

    } else {
      throw new Error("Mode de transfert non disponible avec la configuration actuelle.");
    }
  } catch (err: any) {
    transferError = err.message;
    
    // Log detaille de l'erreur
    await logApiError(
      "MPAY_EXTERNAL_TRANSFER",
      "TRANSFER_FAILED",
      err,
      { userId: senderId, requestId }
    );
    
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "TRANSFER_ERROR",
      message: `Echec du transfert: ${err.message}`,
      details: {
        error: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 5),
        response: err.response?.data,
        destination,
        amount: amountNum,
        piUid,
        isPiAddress,
        mode: piUid && canA2U ? "A2U" : "DIRECT",
      },
      userId: senderId,
      requestId,
    });
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
          requestId,
        },
      },
    });

    // Stats globales
    await prisma.systemConfig.upsert({
      where:  { id: "GLOBAL_CONFIG" },
      update: { totalVolumePi: { increment: amountNum }, totalProfit: { increment: fee } },
      create: { id: "GLOBAL_CONFIG", totalVolumePi: amountNum, totalProfit: fee },
    }).catch(() => {});

    // Log succes final
    await logSystemEvent({
      level: "INFO",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "TRANSFER_SUCCESS",
      message: `Transfert externe reussi: ${amountNum} Pi vers ${(recipientAddress || destination).slice(0, 8)}...`,
      details: {
        txRef,
        blockchainTxHash,
        piPaymentId,
        amount: amountNum,
        fee,
        destination: recipientAddress || destination,
        mode: piUid && canA2U ? "A2U" : "DIRECT",
      },
      userId: senderId,
      requestId,
    });

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
            requestId,
          },
        },
      }),
      prisma.wallet.update({
        where: { id: senderWallet.id },
        data:  { balance: { increment: totalDeduction } },
      }),
    ]);

    // Log echec avec remboursement
    await logSystemEvent({
      level: "WARN",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "TRANSFER_FAILED_REFUNDED",
      message: `Transfert echoue, solde restaure: ${totalDeduction} Pi`,
      details: {
        txRef,
        error: transferError,
        amount: amountNum,
        totalDeduction,
        destination,
        mode: piUid && canA2U ? "A2U" : "DIRECT",
      },
      userId: senderId,
      requestId,
    });

    return NextResponse.json(
      { success: false, error: transferError || "Echec du transfert. Votre solde a ete restaure.", requestId },
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
