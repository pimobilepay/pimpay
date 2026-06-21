export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { verifyAuth } from "@/lib/adminAuth";

/**
 * GET /api/admin/treasury/pi-diagnostic
 *
 * Diagnostic SÉCURISÉ de la configuration du wallet maître Pi.
 *
 * Ce endpoint NE renvoie JAMAIS la clé secrète. Il dérive uniquement la clé
 * PUBLIQUE (non sensible) à partir de PI_MASTER_WALLET_SECRET et la compare aux
 * adresses configurées, afin d'identifier précisément la cause de l'erreur :
 *   "la cle secrete (PI_MASTER_WALLET_SECRET) ne correspond pas a l'adresse
 *    (PI_MASTER_WALLET_ADDRESS)".
 */

function mask(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 12) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const masterAddress = process.env.PI_MASTER_WALLET_ADDRESS || null;
    const masterSecret = process.env.PI_MASTER_WALLET_SECRET || null;
    const operatorAddress =
      process.env.PI_WALLET_PUBLIC_KEY ||
      process.env.PI_OPERATOR_ADDRESS ||
      null;

    const checks: Record<string, unknown> = {
      PI_MASTER_WALLET_ADDRESS_present: Boolean(masterAddress),
      PI_MASTER_WALLET_SECRET_present: Boolean(masterSecret),
      operatorAddress_present: Boolean(operatorAddress),
      PI_MASTER_WALLET_ADDRESS_masked: mask(masterAddress),
      operatorAddress_masked: mask(operatorAddress),
    };

    // 1. La clé secrète est-elle un format Stellar valide ?
    let secretIsValidFormat = false;
    let derivedPublicKey: string | null = null;
    if (masterSecret) {
      try {
        const kp = StellarSdk.Keypair.fromSecret(masterSecret);
        secretIsValidFormat = true;
        derivedPublicKey = kp.publicKey();
      } catch {
        secretIsValidFormat = false;
      }
    }
    checks.secretIsValidStellarFormat = secretIsValidFormat;
    checks.derivedPublicKeyFromSecret_masked = mask(derivedPublicKey);

    // 2. L'adresse maître est-elle un format Stellar valide ?
    checks.masterAddressIsValidFormat = masterAddress
      ? StellarSdk.StrKey.isValidEd25519PublicKey(masterAddress)
      : false;

    // 3. La clé secrète correspond-elle à PI_MASTER_WALLET_ADDRESS ?
    const secretMatchesMaster =
      Boolean(derivedPublicKey) &&
      Boolean(masterAddress) &&
      derivedPublicKey === masterAddress;
    checks.secretMatchesMasterAddress = secretMatchesMaster;

    // 4. La clé secrète correspond-elle plutôt à l'adresse opérateur affichée ?
    const secretMatchesOperator =
      Boolean(derivedPublicKey) &&
      Boolean(operatorAddress) &&
      derivedPublicKey === operatorAddress;
    checks.secretMatchesOperatorAddress = secretMatchesOperator;

    // 5. L'adresse maître == l'adresse opérateur affichée ?
    checks.masterAddressEqualsOperatorAddress =
      Boolean(masterAddress) &&
      Boolean(operatorAddress) &&
      masterAddress === operatorAddress;

    // ── Diagnostic lisible ────────────────────────────────────────────────
    let verdict: string;
    const fixes: string[] = [];

    if (!masterAddress || !masterSecret) {
      verdict =
        "Variables manquantes : PI_MASTER_WALLET_ADDRESS et/ou PI_MASTER_WALLET_SECRET ne sont pas définies.";
      fixes.push(
        "Définissez PI_MASTER_WALLET_ADDRESS (adresse publique G…) et PI_MASTER_WALLET_SECRET (clé secrète S…) dans les variables d'environnement du projet."
      );
    } else if (!secretIsValidFormat) {
      verdict =
        "PI_MASTER_WALLET_SECRET n'est pas une clé secrète Stellar valide (elle doit commencer par 'S' et faire 56 caractères).";
      fixes.push(
        "Vérifiez que vous avez collé la clé secrète complète (S…) sans espace ni retour à la ligne."
      );
    } else if (secretMatchesMaster) {
      verdict =
        "OK : la clé secrète correspond bien à PI_MASTER_WALLET_ADDRESS. La configuration du wallet maître est valide.";
    } else if (secretMatchesOperator) {
      verdict =
        "INCOHÉRENCE : votre clé secrète correspond à l'adresse OPÉRATEUR affichée (celle qui contient les fonds), pas à PI_MASTER_WALLET_ADDRESS.";
      fixes.push(
        `Remplacez PI_MASTER_WALLET_ADDRESS par l'adresse opérateur ${mask(operatorAddress)} (celle qui matche votre clé), afin que les deux variables désignent le même wallet.`
      );
    } else {
      verdict =
        "INCOHÉRENCE : la clé secrète ne dérive ni vers PI_MASTER_WALLET_ADDRESS ni vers l'adresse opérateur affichée. La clé et l'adresse proviennent de deux wallets différents.";
      fixes.push(
        `La clé secrète configurée correspond en réalité à l'adresse ${mask(derivedPublicKey)}.`
      );
      fixes.push(
        "Soit corrigez PI_MASTER_WALLET_SECRET avec la clé du wallet voulu, soit corrigez PI_MASTER_WALLET_ADDRESS pour qu'elle corresponde au wallet de la clé."
      );
    }

    return NextResponse.json({
      success: true,
      verdict,
      fixes,
      checks,
      note: "La clé secrète n'est jamais renvoyée. Les adresses sont masquées à des fins de sécurité.",
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message },
      { status: 500 }
    );
  }
}
