/**
 * POST /api/admin/repair-wallets
 * Détecte et répare toutes les adresses USDT (TRC20) invalides en base.
 *
 * Les adresses générées avant le correctif utilisaient un algorithme simplifié
 * (SHA256 hex) produisant des adresses non conformes au standard Base58Check Tron.
 * Ces adresses sont rejetées par le réseau avec "network mismatch".
 *
 * Cet endpoint régénère toutes les adresses invalides avec l'algo correct.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { Wallet as EthWallet } from "ethers";
import crypto from "crypto";

// Alphabet Base58 (Bitcoin/Tron) — exclut 0, O, I, l
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Regex d'une adresse TRC20 valide : T + 33 caractères Base58
const TRON_VALID_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * Génère une adresse Tron valide via encodage Base58Check officiel.
 * Algorithme : Base58Check( 0x41 ‖ KECCAK256(pubKey)[12:] )
 */
function generateValidTronAddress(): { address: string; privateKey: string } {
  const evmWallet = EthWallet.createRandom();
  const privKey = evmWallet.privateKey.replace("0x", "");
  const ethAddress = evmWallet.address;

  // Préfixe réseau Tron (0x41) + 20 octets adresse Ethereum
  const addrBytes = Buffer.concat([
    Buffer.from("41", "hex"),
    Buffer.from(ethAddress.replace("0x", ""), "hex"),
  ]);

  // Double SHA256 → checksum (4 premiers octets)
  const h1 = crypto.createHash("sha256").update(addrBytes).digest();
  const h2 = crypto.createHash("sha256").update(h1).digest();
  const payload = Buffer.concat([addrBytes, h2.slice(0, 4)]);

  // Encodage Base58
  let n = BigInt("0x" + payload.toString("hex"));
  let encoded = "";
  while (n > 0n) {
    encoded = BASE58[Number(n % 58n)] + encoded;
    n = n / 58n;
  }

  return { address: encoded, privateKey: privKey };
}

export async function POST(req: NextRequest) {
  try {
    // Authentification admin
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Récupérer tous les utilisateurs avec une adresse USDT
    const users = await prisma.user.findMany({
      where: { usdtAddress: { not: null } },
      select: { id: true, username: true, usdtAddress: true },
    });

    const invalid = users.filter(
      (u) => u.usdtAddress && !TRON_VALID_REGEX.test(u.usdtAddress)
    );

    if (invalid.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune adresse invalide trouvée. Tout est en ordre.",
        stats: { total: users.length, invalid: 0, repaired: 0 },
      });
    }

    // Réparer chaque adresse invalide
    let repaired = 0;
    const errors: string[] = [];

    for (const user of invalid) {
      try {
        const { address: newAddress, privateKey } = generateValidTronAddress();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            usdtAddress: newAddress,
            usdtPrivateKey: encrypt(privateKey),
          },
        });
        repaired++;
        console.log(
          `[REPAIR_WALLET] Réparé user ${user.username || user.id}: ${user.usdtAddress} → ${newAddress}`
        );
      } catch (err: any) {
        errors.push(`User ${user.id}: ${err.message}`);
        console.error(`[REPAIR_WALLET] Erreur user ${user.id}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${repaired}/${invalid.length} adresses USDT réparées avec succès.`,
      stats: {
        total: users.length,
        invalid: invalid.length,
        repaired,
        errors: errors.length,
      },
      ...(errors.length > 0 && { errorDetails: errors }),
    });
  } catch (error: any) {
    console.error("[REPAIR_WALLET] Erreur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET — Audit uniquement (sans modification)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { usdtAddress: { not: null } },
      select: { id: true, username: true, usdtAddress: true },
    });

    const invalid = users.filter(
      (u) => u.usdtAddress && !TRON_VALID_REGEX.test(u.usdtAddress)
    );

    return NextResponse.json({
      success: true,
      stats: {
        total: users.length,
        valid: users.length - invalid.length,
        invalid: invalid.length,
      },
      invalidAddresses: invalid.map((u) => ({
        userId: u.id,
        username: u.username,
        badAddress: u.usdtAddress,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
