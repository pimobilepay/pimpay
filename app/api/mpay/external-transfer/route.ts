export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { TransactionStatus, TransactionType, WalletType } from '@prisma/client';
import { logSystemEvent, logApiError } from '@/lib/systemLogger';
import { enforcePiPolicy, WithdrawalPolicyError } from '@/lib/withdrawal-limits';
import { guardRequest } from '@/lib/defenseGuard';

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
 *   PI_NETWORK              - "testnet" (defaut) ou "mainnet"
 *   PI_HORIZON_URL          - (optionnel) detecte auto selon PI_NETWORK
 *                             testnet:  https://api.testnet.minepi.com
 *                             mainnet:  https://api.mainnet.minepi.com
 *   PI_NETWORK_PASSPHRASE   - (optionnel) detecte auto: "Pi Testnet" | "Pi Network"
 */

const PI_API_URL          = "https://api.minepi.com";

// IMPORTANT: Pi testnet  → https://api.testnet.minepi.com   passphrase "Pi Testnet"
//            Pi mainnet  → https://api.mainnet.minepi.com   passphrase "Pi Network"
// La valeur est lue à CHAQUE requête (pas au démarrage du module) pour que
// le basculement admin via /api/admin/pi-network prenne effet immédiatement
// sans redéploiement.
function getPiEnv() {
  const env = (process.env.PI_NETWORK || "testnet").toLowerCase();
  return {
    isMainnet: env === "mainnet",
    horizonUrl:
      process.env.PI_HORIZON_URL ||
      (env === "mainnet"
        ? "https://api.mainnet.minepi.com"
        : "https://api.testnet.minepi.com"),
    passphrase:
      process.env.PI_NETWORK_PASSPHRASE ||
      (env === "mainnet" ? "Pi Network" : "Pi Testnet"),
  };
}

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
    details: { paymentId: data.identifier, recipientAddress: data.recipient },
    requestId,
  });

  return {
    paymentId:        data.identifier as string,
    recipientAddress: data.recipient  as string,   // champ correct selon doc officielle Pi
  };
}

// ---------------------------------------------------------------------------
// Etape 2: signer et broadcaster la transaction Stellar/Pi
// Retourne: txHash (string)
// ---------------------------------------------------------------------------
async function broadcastPi(
  toAddress: string,
  amount: number,
  memo: string,
  requestId?: string,
  a2uPaymentId?: string   // si A2U, le memo DOIT être le paymentIdentifier (doc Pi officielle)
): Promise<string> {
  const startTime = Date.now();
  // Lire le réseau à chaque appel pour refléter le basculement admin immédiatement
  const { horizonUrl: PI_HORIZON_URL, passphrase: PI_NETWORK_PASSPHRASE } = getPiEnv();
  
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

  // ── Garde anti tx_bad_auth #1 ───────────────────────────────────────────
  // La cause #1 d'une erreur "tx_bad_auth" est que la cle secrete ne
  // correspond pas a l'adresse publique du compte source. On le verifie
  // explicitement AVANT de construire/signer la transaction pour renvoyer un
  // message clair plutot qu'un rejet 400 cryptique du reseau Stellar.
  let masterKeypair: StellarSdk.Keypair;
  try {
    masterKeypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET);
  } catch {
    throw new Error("PI_MASTER_WALLET_SECRET invalide : ce n'est pas une cle secrete Stellar valide (doit commencer par S).");
  }
  if (masterKeypair.publicKey() !== PI_MASTER_ADDRESS) {
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "MASTER_KEY_MISMATCH",
      message: "PI_MASTER_WALLET_SECRET ne correspond pas a PI_MASTER_WALLET_ADDRESS",
      details: {
        configuredAddress: PI_MASTER_ADDRESS,
        secretPublicKey: masterKeypair.publicKey(),
      },
      requestId,
    });
    throw new Error(
      "Configuration du wallet maitre invalide : la cle secrete (PI_MASTER_WALLET_SECRET) ne correspond pas a l'adresse (PI_MASTER_WALLET_ADDRESS)."
    );
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

  // ── Garde anti tx_bad_auth #2 ───────────────────────────────────────────
  // La 2e cause d'une erreur "tx_bad_auth" est une passphrase reseau qui ne
  // correspond pas a celle attendue par le Horizon ciblé. On lit la passphrase
  // REELLE directement depuis la racine du serveur Horizon : ainsi la signature
  // est toujours calculee avec la meme passphrase que celle du reseau auquel la
  // transaction est soumise. Fallback sur la valeur configuree si indisponible.
  let networkPassphrase = PI_NETWORK_PASSPHRASE;
  try {
    const rootRes = await fetch(PI_HORIZON_URL, { headers: { Accept: "application/json" } });
    const root: any = await rootRes.json().catch(() => ({}));
    if (root?.network_passphrase) {
      networkPassphrase = root.network_passphrase;
      if (networkPassphrase !== PI_NETWORK_PASSPHRASE) {
        await logSystemEvent({
          level: "WARN",
          source: "MPAY_EXTERNAL_TRANSFER",
          action: "PASSPHRASE_OVERRIDE",
          message: "Passphrase reseau Horizon differente de la config — utilisation de celle d'Horizon",
          details: { configured: PI_NETWORK_PASSPHRASE, horizon: networkPassphrase },
          requestId,
        });
      }
    }
  } catch {
    // Horizon root indisponible → on garde la passphrase configuree
  }

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
    dynamicFee = "10000";
    await logSystemEvent({
      level: "WARN",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "FEE_FETCH_FAILED",
      message: `Echec fetchBaseFee, utilisation fallback: ${dynamicFee} stroops`,
      details: { error: feeError.message },
      requestId,
    });
  }

  // IMPORTANT (doc officielle Pi) :
  //   - En mode A2U : le memo DOIT être le paymentIdentifier (pas un texte libre)
  //   - En mode Direct : memo texte libre (max 28 chars)
  const memoValue = a2uPaymentId ?? memo.slice(0, 28);

  // fetchTimebounds garantit la synchronisation avec l'horloge du réseau (recommandé par doc Stellar/Pi)
  let timebounds: { minTime: number; maxTime: number };
  try {
    timebounds = await server.fetchTimebounds(180);
  } catch {
    const now = Math.floor(Date.now() / 1000);
    timebounds = { minTime: 0, maxTime: now + 180 };
  }

  // Construire la transaction
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: dynamicFee,
    networkPassphrase,
    timebounds,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(memoValue))
    .build();

  tx.sign(masterKeypair);

  let result: any;
  try {
    result = await server.submitTransaction(tx);
  } catch (submitErr: any) {
    // L'erreur Axios 400 du reseau contient les result_codes Stellar precis
    const resultCodes = submitErr?.response?.data?.extras?.result_codes;
    const txCode = resultCodes?.transaction;
    await logSystemEvent({
      level: "ERROR",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "BROADCAST_SUBMIT_ERROR",
      message: `Soumission rejetee par le reseau: ${txCode || submitErr?.message}`,
      details: { resultCodes, networkPassphrase, status: submitErr?.response?.status },
      requestId,
    });
    if (txCode === "tx_bad_auth" || txCode === "tx_bad_auth_extra") {
      throw new Error(
        "Signature refusee par le reseau Pi (tx_bad_auth). Verifiez que PI_MASTER_WALLET_SECRET correspond bien a l'adresse maitre et que PI_NETWORK (testnet/mainnet) est correct."
      );
    }
    if (txCode === "tx_bad_seq") {
      throw new Error("Numero de sequence invalide (tx_bad_seq). Reessayez dans quelques instants.");
    }
    throw new Error(
      txCode
        ? `Transaction rejetee par le reseau Pi: ${txCode}`
        : (submitErr?.message || "Echec de soumission de la transaction Pi.")
    );
  }
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

  // [IDS] Défense : bloque les opérations sensibles via IP en liste noire ou
  // réseau anonyme (VPN/proxy/Tor) selon les réglages admin.
  const guard = await guardRequest(req, { context: "external-transfer", userId: session.id });
  if (!guard.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: guard.blockedByList
          ? "Accès refusé. Adresse bloquée pour activité suspecte."
          : "Opération refusée. Les transferts via VPN, proxy ou réseau anonyme ne sont pas autorisés.",
      },
      { status: guard.status }
    );
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

  // Lire la configuration réseau Pi (testnet vs mainnet) pour cette requête
  const { horizonUrl: _horizonUrl, passphrase: PI_NETWORK_PASSPHRASE } = getPiEnv();

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

  // Les UID Pi Mainnet sont souvent préfixés par "P" suivi d'une chaîne hexadécimale
  // ex: P5BA1314428A1A687743D78F3AF3D6C6D17933AFE
  // L'API Pi Platform attend l'UID SANS le préfixe "P" → on le retire avant l'appel A2U
  const isPPrefixedUid = /^P[0-9A-Fa-f]{20,}$/.test(destination);

  // uid peut venir du body OU destination peut etre un UID Pi (non-adresse G...)
  // Si c'est un UID avec préfixe P, on retire le P pour l'API Pi Platform
  const rawUid: string | null = uid || (!isPiAddress ? destination : null);
  const piUid: string | null = rawUid
    ? (/^P[0-9A-Fa-f]{20,}$/.test(rawUid) ? rawUid.slice(1) : rawUid)
    : null;

  await logSystemEvent({
    level: "DEBUG",
    source: "MPAY_EXTERNAL_TRANSFER",
    action: "ADDRESS_DETECTION",
    message: `Detection adresse: isPiAddress=${isPiAddress}, isPPrefixedUid=${isPPrefixedUid}, piUid=${piUid ? 'oui' : 'non'}`,
    details: { isPiAddress, isPPrefixedUid, piUid, destinationRaw: destination },
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

  // ─────────────────────────────────────────────────────────────────────────
  // POLITIQUE KYC + PLAFONDS (denominee en Pi)
  // Recuperee une seule fois ; appliquee differemment selon transfert interne
  // (P2P) ou retrait externe (blockchain). Voir lib/withdrawal-limits.ts.
  // ─────────────────────────────────────────────────────────────────────────
  const senderForKyc = await prisma.user.findUnique({
    where: { id: senderId },
    select: { kycStatus: true },
  });
  const senderKyc = senderForKyc?.kycStatus;

  // ─────────────────────────────────────────────────────────────────────────
  // 4bis. RÉSOLUTION INTERNE PimPay
  // Une adresse Pi interne (UID préfixé "P" ou adresse Pi enregistrée) peut
  // appartenir à un membre PimPay. Dans ce cas on effectue un transfert INTERNE
  // instantané au lieu d'un appel Pi Platform A2U — qui échouerait avec
  // "User with uid ... was not found" pour un compte non enregistré côté Pi.
  // On teste la valeur brute ET la valeur sans le préfixe "P".
  // ─────────────────────────────────────────────────────────────────────────
  const destTrimmed = String(destination).trim();
  const destNoP = /^P[0-9A-Fa-f]{20,}$/.test(destTrimmed) ? destTrimmed.slice(1) : destTrimmed;

  const internalRecipient = await prisma.user.findFirst({
    where: {
      OR: [
        { piUserId: destTrimmed },
        { piUserId: destNoP },
        { walletAddress: destTrimmed },
        { walletAddress: destNoP },
      ],
    },
    select: { id: true, name: true, username: true },
  });

  if (internalRecipient && internalRecipient.id === senderId) {
    return NextResponse.json(
      { success: false, error: "Auto-envoi interdit : vous ne pouvez pas vous envoyer des Pi à vous-même." },
      { status: 400 }
    );
  }

  if (internalRecipient) {
    // Transfert P2P interne : KYC obligatoire (>5 Pi) + plafond 100 Pi/tx (verifies).
    // Pas de limite journaliere (countDaily=false) ni de validation admin.
    try {
      await enforcePiPolicy(prisma, {
        userId: senderId,
        amountPi: amountNum,
        kycStatus: senderKyc,
        countDaily: false,
      });
    } catch (e: any) {
      if (e instanceof WithdrawalPolicyError) {
        return NextResponse.json(
          { success: false, error: e.message, code: e.code },
          { status: e.status }
        );
      }
      throw e;
    }

    const internalRef = `PIM-INT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, username: true },
    });
    const senderName = sender?.name || sender?.username || "Un membre PimPay";

    try {
      const internalResult = await prisma.$transaction(async (txdb) => {
        const debited = await txdb.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: totalDeduction } },
        });

        const toWallet = await txdb.wallet.upsert({
          where: { userId_currency: { userId: internalRecipient.id, currency: "PI" } },
          update: { balance: { increment: amountNum } },
          create: {
            userId: internalRecipient.id,
            currency: "PI",
            balance: amountNum,
            type: WalletType.PI,
          },
        });

        const transaction = await txdb.transaction.create({
          data: {
            reference: internalRef,
            amount: amountNum,
            fee,
            netAmount: amountNum,
            currency: "PI",
            type: TransactionType.TRANSFER,
            status: TransactionStatus.SUCCESS,
            fromUserId: senderId,
            toUserId: internalRecipient.id,
            fromWalletId: senderWallet.id,
            toWalletId: toWallet.id,
            description: `Transfert interne Pi vers @${internalRecipient.username || internalRecipient.name || "membre PimPay"}`,
            metadata: {
              internalTransfer: true,
              piAddress: destTrimmed,
              network: "PimPay (interne)",
              completedAt: new Date().toISOString(),
            },
          },
        });

        await txdb.notification
          .create({
            data: {
              userId: internalRecipient.id,
              title: "Paiement Pi recu !",
              message: `Vous avez recu ${amountNum} PI de ${senderName}.`,
              type: "PAYMENT_RECEIVED",
              metadata: { amount: amountNum, currency: "PI", senderName, reference: internalRef },
            },
          })
          .catch(() => {});

        return { transaction, newBalance: debited.balance };
      });

      await logSystemEvent({
        level: "INFO",
        source: "MPAY_EXTERNAL_TRANSFER",
        action: "INTERNAL_TRANSFER_SUCCESS",
        message: `Transfert Pi interne instantane: ${amountNum} Pi vers ${internalRecipient.username || internalRecipient.id}`,
        details: { internalRef, amount: amountNum, fee, recipientId: internalRecipient.id, piAddress: destTrimmed },
        userId: senderId,
        requestId,
      });

      return NextResponse.json({
        success: true,
        message: "Transfert Pi interne instantané réussi",
        data: {
          txid: internalRef,
          status: "COMPLETED",
          mode: "INTERNAL",
          amount: amountNum,
          fee,
          destination: destTrimmed,
          newBalance: internalResult.newBalance,
        },
      });
    } catch (e: any) {
      await logApiError("MPAY_EXTERNAL_TRANSFER", "INTERNAL_TRANSFER_FAILED", e, { userId: senderId, requestId });
      return NextResponse.json(
        { success: false, error: e.message || "Echec du transfert interne." },
        { status: 500 }
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RETRAIT EXTERNE : politique complete (KYC > 5 Pi, plafond 100 Pi/tx,
  // 10 retraits/jour pour comptes non verifies) + retenue admin pour les gros
  // montants des comptes verifies.
  // ─────────────────────────────────────────────────────────────────────────
  let requiresAdminApproval = false;
  try {
    const policy = await enforcePiPolicy(prisma, {
      userId: senderId,
      amountPi: amountNum,
      kycStatus: senderKyc,
      countDaily: true,
    });
    requiresAdminApproval = policy.requiresAdminApproval;
  } catch (e: any) {
    if (e instanceof WithdrawalPolicyError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    throw e;
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

  // 5bis. RETENUE ADMIN : si le montant exige une validation administrateur,
  // on NE diffuse PAS sur la blockchain. Le wallet est deja debite (section 5)
  // et la transaction reste PENDING/MANUAL_REVIEW jusqu'a validation par un admin.
  if (requiresAdminApproval) {
    await prisma.transaction.update({
      where: { id: dbTx.id },
      data: {
        statusClass: "MANUAL_REVIEW",
        metadata: {
          ...(dbTx.metadata as object),
          requiresAdminApproval: true,
          heldForReviewAt: new Date().toISOString(),
        },
      },
    });

    await prisma.notification
      .create({
        data: {
          userId: senderId,
          title: "Retrait en attente de validation",
          message: `Votre retrait de ${amountNum} Pi depasse le seuil autorise et doit etre valide par un administrateur avant diffusion.`,
          type: "INFO",
        },
      })
      .catch(() => {});

    await logSystemEvent({
      level: "INFO",
      source: "MPAY_EXTERNAL_TRANSFER",
      action: "WITHDRAW_HELD_FOR_REVIEW",
      message: `Retrait Pi de ${amountNum} Pi mis en attente de validation admin`,
      details: { txRef, amount: amountNum },
      userId: senderId,
      requestId,
    });

    return NextResponse.json({
      success: true,
      requiresAdminApproval: true,
      message: "Demande de retrait transmise. En attente de validation administrateur.",
      data: {
        txid: txRef,
        status: "PENDING",
        amount: amountNum,
        fee,
        destination: isPiAddress ? destination : piUid,
      },
    });
  }

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

      // b) Broadcaster la transaction blockchain — passer le paymentId comme memo (obligatoire A2U)
      blockchainTxHash = await broadcastPi(recipientAddress, amountNum, memoText, requestId, piPaymentId!);

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
      
      // Mode Direct : memo texte libre, pas de paymentId Pi
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
  const { horizonUrl: PI_HORIZON_URL, passphrase: PI_NETWORK_PASSPHRASE } = getPiEnv();
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
