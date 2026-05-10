export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

// Cache for Pi price (5 minute TTL)
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback price if CoinGecko is unavailable
const FALLBACK_PI_PRICE = 1.5;

async function fetchPiPriceFromCoinGecko(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd",
      {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "PimPay/1.0",
        },
        next: { revalidate: 300 }, // 5 min
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko responded with ${response.status}`);
    }

    const data = await response.json();
    const price = data?.["pi-network"]?.usd;

    if (typeof price !== "number" || price <= 0) {
      throw new Error("Invalid price from CoinGecko");
    }

    return price;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached price if still valid
    if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        price: cachedPrice.price,
        source: "cache",
        timestamp: cachedPrice.timestamp,
        currency: "USD",
      });
    }

    // Fetch fresh price from CoinGecko
    let price: number;
    let source: string;

    try {
      price = await fetchPiPriceFromCoinGecko();
      source = "coingecko";
    } catch (err) {
      console.error("[pi-price] CoinGecko fetch failed:", err);
      // Use previous cache even if expired, or fallback
      price = cachedPrice?.price ?? FALLBACK_PI_PRICE;
      source = cachedPrice ? "stale-cache" : "fallback";
    }

    // Update cache
    cachedPrice = { price, timestamp: now };

    return NextResponse.json({
      success: true,
      price,
      source,
      timestamp: now,
      currency: "USD",
    });
  } catch (error) {
    console.error("[pi-price] Error:", error);
    const fallbackPrice = cachedPrice?.price ?? FALLBACK_PI_PRICE;
    return NextResponse.json({
      success: true,
      price: fallbackPrice,
      source: "fallback",
      timestamp: Date.now(),
      currency: "USD",
    });
  }
}
