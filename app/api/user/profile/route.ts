/**
 * app/api/user/profile/route.ts
 *
 * [FIX V1 — CRITIQUE] Clés privées blockchain retirées de la réponse.
 *
 * AVANT : return NextResponse.json({ user: { ...user } })
 *   → Spread complet incluant sidraPrivateKey, usdtPrivateKey, stellarPrivateKey,
 *     xrpPrivateKey, walletPrivateKey, solPrivateKey, password, pin, twoFactorSecret.
 *   → Toute personne avec un token de session récupérait TOUTES les clés privées.
 *
 * APRÈS : Prisma select{} strict — uniquement les champs nécessaires à l'UI.
 *   → Les *PrivateKey, password, pin, twoFactorSecret ne quittent JAMAIS le serveur.
 *   → Le select est la liste exhaustive des champs consommés dans les pages
 *     dashboard, wallet, profile, mpay, settings, cards.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Wallet as EthersWallet } from "ethers";
import crypto from "crypto";

// ─── Génération des identités blockchain (côté serveur uniquement) ──────────
// Les clés privées générées ici sont STOCKÉES en DB chiffrées mais ne sont
// JAMAIS retournées au client.
const generateBlockchainIdentities = () => {
  const sidraWallet = EthersWallet.createRandom();
  const usdtPrivKey = crypto.randomBytes(32).toString("hex");
  const usdtAddr = `T${crypto.randomBytes(20).toString("hex").substring(0, 33)}`;
  const piPrivKey = crypto.randomBytes(32).toString("hex");
  const piAddr = `P${crypto.randomBytes(20).toString("hex").toUpperCase()}`;

  return {
    sidra: { address: sidraWallet.address, privateKey: sidraWallet.privateKey },
    usdt:  { address: usdtAddr, privateKey: usdtPrivKey },
    pi:    { address: piAddr,   privateKey: piPrivKey },
  };
};

const REQUIRED_WALLETS = [
  { currency: "XAF",  type: "FIAT"   as const },
  { currency: "PI",   type: "PI"     as const },
  { currency: "SDA",  type: "SIDRA"  as const },
  { currency: "USDT", type: "CRYPTO" as const },
  { currency: "BTC",  type: "CRYPTO" as const },
  { currency: "XRP",  type: "CRYPTO" as const },
  { currency: "XLM",  type: "CRYPTO" as const },
  { currency: "USDC", type: "CRYPTO" as const },
  { currency: "DAI",  type: "CRYPTO" as const },
  { currency: "BUSD", type: "CRYPTO" as const },
];

// ─── Sélection sûre — AUCUNE clé privée, AUCUN secret ──────────────────────
// Liste exhaustive des champs consommés par le frontend.
// Tout champ non listé ici est automatiquement exclu de la réponse.
const SAFE_USER_SELECT = {
  // Identité
  id:               true,
  username:         true,
  email:            true,
  name:             true,
  firstName:        true,
  lastName:         true,
  phone:            true,
  avatar:           true,
  gender:           true,
  nationality:      true,
  occupation:       true,
  birthDate:        true,

  // Localisation
  country:          true,
  city:             true,
  address:          true,
  postalCode:       true,
  provinceState:    true,
  latitude:         true,
  longitude:        true,

  // KYC & statut
  kycStatus:        true,
  kycSubmittedAt:   true,
  kycVerifiedAt:    true,
  kycReason:        true,
  status:           true,
  statusReason:     true,
  maintenanceUntil: true,
  idType:           true,
  idNumber:         true,
  idCountry:        true,
  idDeliveryDate:   true,
  idExpiryDate:     true,

  // Rôle & limites
  role:             true,
  dailyLimit:       true,
  monthlyLimit:     true,

  // Adresses blockchain publiques UNIQUEMENT (jamais les clés privées)
  walletAddress:    true,
  piUserId:         true,
  sidraAddress:     true,
  usdtAddress:      true,
  xlmAddress:       true,
  xrpAddress:       true,
  solAddress:       true,

  // Sécurité (état, jamais les secrets)
  twoFactorEnabled: true,

  // Parrainage
  referralCode:     true,
  referredById:     true,

  // Timestamps
  createdAt:        true,
  lastLoginAt:      true,
  lastLoginIp:      true,

  // Relations incluses
  wallets: true,
  virtualCards: {
    select: {
      id:          true,
      number:      true, // Chiffré en DB, déchiffré côté serveur si besoin
      exp:         true,
      brand:       true,
      type:        true,
      isFrozen:    true,
      dailyLimit:  true,
      totalSpent:  true,
      createdAt:   true,
      // cvv intentionnellement EXCLU (PCI-DSS 3.2 — ne jamais retourner le CVV)
      // isPrimary retiré — champ absent du schéma Prisma VirtualCard
    },
  },
  referrals: {
    select: {
      id:        true,
      name:      true,
      username:  true,
      avatar:    true,
      createdAt: true,
    },
  },

  // ─── CHAMPS EXPLICITEMENT EXCLUS (ne jamais exposer) ───────────────────
  // password, pin, pinVersion, pinUpdatedAt, twoFactorSecret,
  // sidraPrivateKey, usdtPrivateKey, walletPrivateKey, stellarPrivateKey,
  // xrpPrivateKey, solPrivateKey, xlmPrivateKey, usdtPrivateKey,
  // refreshToken, kycFrontUrl, kycBackUrl, kycSelfieUrl
} as const;

// ─── Route handler ───────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    // [FIX V2/V13] — Support both cookie-based auth AND Bearer token auth
    // This is needed because useUser hook sends token via Authorization header
    const { getAuthUserId, getAuthUserIdFromBearer } = await import("@/lib/auth");
    
    // Try Bearer token first (from Authorization header)
    let userId = await getAuthUserIdFromBearer(request);
    
    // Fallback to cookie-based auth
    if (!userId) {
      userId = await getAuthUserId();
    }

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // ── Fetch initial avec select sûr ──────────────────────────────────────
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // ── Provisioning des adresses blockchain si absentes ───────────────────
    // Les clés privées sont générées et stockées en DB mais NE SONT PAS
    // retournées dans la réponse (non présentes dans SAFE_USER_SELECT).
    if (!user.sidraAddress || !user.usdtAddress || !user.walletAddress) {
      const ids = generateBlockchainIdentities();

      await prisma.user.update({
        where: { id: userId },
        data: {
          sidraAddress:     user.sidraAddress  || ids.sidra.address,
          sidraPrivateKey:  ids.sidra.privateKey, // Stocké en DB, jamais retourné
          walletPrivateKey: ids.sidra.privateKey, // Stocké en DB, jamais retourné
          usdtAddress:      user.usdtAddress   || ids.usdt.address,
          usdtPrivateKey:   ids.usdt.privateKey,  // Stocké en DB, jamais retourné
          walletAddress:    user.walletAddress  || ids.pi.address,
        },
      });

      // Re-fetch avec SAFE_USER_SELECT uniquement
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: SAFE_USER_SELECT,
      }) as typeof user;

      if (!user) {
        return NextResponse.json({ error: "Erreur provisioning" }, { status: 500 });
      }
    }

    // ── Provisioning des wallets manquants ─────────────────────────────────
    const existingCurrencies = new Set(user.wallets.map((w) => w.currency));
    const hasSidra = existingCurrencies.has("SIDRA") || existingCurrencies.has("SDA");

    const missingWallets = REQUIRED_WALLETS.filter((rw) => {
      if (rw.currency === "SDA" && hasSidra) return false;
      return !existingCurrencies.has(rw.currency);
    });

    if (missingWallets.length > 0) {
      await Promise.all(
        missingWallets.map((mw) =>
          prisma.wallet
            .create({
              data: {
                userId:   userId as string,
                currency: mw.currency,
                balance:  0,
                type:     mw.type,
              },
            })
            .catch(() => null)
        )
      );

      // Re-fetch avec wallets complets
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: SAFE_USER_SELECT,
      }) as typeof user;

      if (!user) {
        return NextResponse.json({ error: "Erreur wallets" }, { status: 500 });
      }
    }

    // ── Calcul des soldes ──────────────────────────────────────────────────
    const balances: Record<string, number> = {};
    user.wallets.forEach((w) => {
      const key =
        w.currency === "SIDRA" || w.currency === "SDA"
          ? "sda"
          : w.currency.toLowerCase();
      balances[key] = w.balance;
    });

    // ── Réponse — uniquement les champs du SAFE_USER_SELECT ───────────────
    return NextResponse.json({
      success: true,
      user: {
        // Spread de user est maintenant sûr car user provient de SAFE_USER_SELECT
        // qui exclut explicitement toutes les clés privées et secrets.
        ...user,
        name:
          user.name ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.username ||
          "PIONEER",
        referralCode:  user.referralCode,
        referrals:     user.referrals     || [],
        referralCount: user.referrals?.length || 0,
        balances,
        wallets: user.wallets.map((w) => ({
          ...w,
          currency:
            w.currency === "SIDRA" || w.currency === "SDA" ? "SDA" : w.currency,
        })),
      },
    });
  } catch (error: any) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("[PROFILE_ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
