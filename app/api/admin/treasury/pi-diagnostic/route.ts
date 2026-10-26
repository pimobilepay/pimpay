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

/**
 * POST /api/admin/treasury/pi-diagnostic
 *
 * Trouve, parmi PLUSIEURS clés secrètes candidates, laquelle correspond au
 * wallet opérateur cible (celui qui contient les fonds).
 *
 * Body JSON : { "secrets": ["S....", "S....", ...] }
 *   - Vous pouvez aussi envoyer { "secrets": "S...\nS...\nS..." } (séparées
 *     par des retours à la ligne, des virgules ou des espaces).
 *
 * SÉCURITÉ : aucune clé secrète n'est stockée, loggée ou renvoyée. Pour chaque
 * clé, on ne renvoie QUE l'adresse publique dérivée (masquée) et un booléen
 * indiquant si elle correspond au wallet cible. Les clés sont effacées de la
 * mémoire dès la fin du traitement.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Cible = adresse maître configurée, ou à défaut l'adresse opérateur affichée.
    const targetAddress =
      process.env.PI_MASTER_WALLET_ADDRESS ||
      process.env.PI_WALLET_PUBLIC_KEY ||
      process.env.PI_OPERATOR_ADDRESS ||
      null;

    if (!targetAddress) {
      return NextResponse.json(
        {
          error:
            "Aucune adresse cible : définissez PI_MASTER_WALLET_ADDRESS (ou l'adresse opérateur) avant de tester les clés.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const raw = body?.secrets;

    // Accepte un tableau OU une chaîne (séparée par \n, virgules ou espaces).
    let candidates: string[] = [];
    if (Array.isArray(raw)) {
      candidates = raw.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof raw === "string") {
      candidates = raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            'Aucune clé fournie. Envoyez { "secrets": ["S...", "S..."] } ou une chaîne de clés séparées par des retours à la ligne.',
        },
        { status: 400 }
      );
    }

    let matchIndex = -1;
    const results = candidates.map((secret, index) => {
      let validFormat = false;
      let derived: string | null = null;
      try {
        const kp = StellarSdk.Keypair.fromSecret(secret);
        validFormat = true;
        derived = kp.publicKey();
      } catch {
        validFormat = false;
      }
      const matches = Boolean(derived) && derived === targetAddress;
      if (matches && matchIndex === -1) matchIndex = index;
      return {
        index,
        validStellarFormat: validFormat,
        derivedPublicKey_masked: mask(derived),
        matchesTarget: matches,
      };
    });

    // Effacement défensif des clés en clair.
    candidates.fill("");

    const found = matchIndex !== -1;
    return NextResponse.json({
      success: true,
      targetAddress_masked: mask(targetAddress),
      totalTested: results.length,
      matchFound: found,
      matchIndex: found ? matchIndex : null,
      verdict: found
        ? `Trouvé : la clé n°${matchIndex + 1} correspond au wallet cible ${mask(
            targetAddress
          )}. C'est celle-ci qu'il faut mettre dans PI_MASTER_WALLET_SECRET.`
        : `Aucune des ${results.length} clés testées ne correspond au wallet cible ${mask(
            targetAddress
          )}. Vérifiez que vous possédez bien la clé secrète de ce wallet précis.`,
      results,
      note: "Les clés secrètes ne sont jamais stockées ni renvoyées. Seules les adresses publiques dérivées (masquées) sont affichées.",
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message },
      { status: 500 }
    );
  }
}
