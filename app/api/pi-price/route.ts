export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * SOURCE UNIQUE DU PRIX PI
 *
 * Le prix du Pi Network est désormais entièrement contrôlé par l'administrateur
 * depuis la page Admin → Réglages → Politique Monétaire (champ "Prix GCV").
 * Il est stocké en base dans SystemConfig.consensusPrice (combien de USD pour 1 Pi).
 *
 * Toutes les pages et API (recharge, dépôt, retrait, swap, cartes, trésorerie...)
 * consomment ce prix via cet endpoint ou directement via systemConfig.consensusPrice,
 * garantissant une valeur cohérente sur toute la plateforme.
 */

// Cache court pour éviter de frapper la DB à chaque requête (30s)
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 secondes

// Valeur de repli si la DB est injoignable ET qu'aucun prix n'a encore été chargé
const FALLBACK_PI_PRICE = 314159.0;

async function getAdminConfiguredPrice(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({
    where: { id: "GLOBAL_CONFIG" },
    select: { consensusPrice: true },
  });

  const price = config?.consensusPrice;
  if (typeof price !== "number" || price <= 0) {
    throw new Error("Prix admin non configuré ou invalide");
  }
  return price;
}

export async function GET() {
  const now = Date.now();

  // Retourne le prix mis en cache s'il est encore valide
  if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      price: cachedPrice.price,
      source: "cache",
      timestamp: cachedPrice.timestamp,
      currency: "USD",
    });
  }

  // Pas de DATABASE_URL → fallback direct
  if (!process.env.DATABASE_URL) {
    const price = cachedPrice?.price ?? FALLBACK_PI_PRICE;
    return NextResponse.json({
      success: true,
      price,
      source: "fallback",
      timestamp: now,
      currency: "USD",
    });
  }

  try {
    const price = await getAdminConfiguredPrice();

    // Met à jour le cache
    cachedPrice = { price, timestamp: now };

    return NextResponse.json({
      success: true,
      price,
      source: "admin-config",
      timestamp: now,
      currency: "USD",
    });
  } catch (error) {
    console.error("[pi-price] Lecture du prix admin échouée:", error);
    // Utilise le dernier cache connu, sinon le fallback
    const price = cachedPrice?.price ?? FALLBACK_PI_PRICE;
    return NextResponse.json({
      success: true,
      price,
      source: cachedPrice ? "stale-cache" : "fallback",
      timestamp: now,
      currency: "USD",
    });
  }
}
