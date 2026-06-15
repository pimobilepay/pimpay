export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * SOURCE UNIQUE DU PRIX PI
 *
 * Le prix du Pi Network est contrôlé par l'administrateur depuis la page
 * Admin → Réglages → Politique Monétaire.
 *
 * Deux modes sont disponibles (champ SystemConfig.priceMode) :
 *  - "GCV"    : prix fixe défini par l'admin (SystemConfig.consensusPrice).
 *  - "MARKET" : prix temps réel du marché récupéré depuis CoinGecko.
 *
 * Toutes les pages et API (recharge, dépôt, retrait, swap, cartes, trésorerie...)
 * consomment ce prix via cet endpoint, garantissant une valeur cohérente sur
 * toute la plateforme.
 */

// Cache court pour éviter de frapper la DB / l'API marché à chaque requête (30s)
let cachedPrice: { price: number; source: string; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 secondes

// Valeur de repli si la DB est injoignable ET qu'aucun prix n'a encore été chargé
const FALLBACK_PI_PRICE = 314159.0;

type PriceMode = "GCV" | "MARKET";

async function getAdminConfig(): Promise<{ price: number; priceMode: PriceMode }> {
  const config = await prisma.systemConfig.findUnique({
    where: { id: "GLOBAL_CONFIG" },
    select: { consensusPrice: true, priceMode: true },
  });

  const price = config?.consensusPrice;
  if (typeof price !== "number" || price <= 0) {
    throw new Error("Prix admin non configuré ou invalide");
  }
  const priceMode: PriceMode = config?.priceMode === "MARKET" ? "MARKET" : "GCV";
  return { price, priceMode };
}

// Récupère le prix marché temps réel du Pi Network depuis CoinGecko
async function getMarketPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd",
    { headers: { accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  const price = data?.["pi-network"]?.usd;
  if (typeof price !== "number" || price <= 0) {
    throw new Error("Prix marché indisponible");
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
      source: cachedPrice.source,
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
    const { price: gcvPrice, priceMode } = await getAdminConfig();

    let price = gcvPrice;
    let source = "admin-config";

    // En mode MARKET, on tente de récupérer le prix temps réel.
    if (priceMode === "MARKET") {
      try {
        price = await getMarketPrice();
        source = "market";
      } catch (e) {
        // Repli sur le prix GCV si le marché est injoignable
        console.error("[pi-price] Récupération du prix marché échouée:", e);
        price = gcvPrice;
        source = "market-fallback-gcv";
      }
    }

    // Met à jour le cache
    cachedPrice = { price, source, timestamp: now };

    return NextResponse.json({
      success: true,
      price,
      source,
      mode: priceMode,
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
