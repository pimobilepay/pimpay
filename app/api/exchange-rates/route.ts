import { NextResponse } from "next/server";

// Cache for exchange rates (1 hour TTL)
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  NZD: 1.65,
  CHF: 0.88,
  JPY: 154,
  CNY: 7.24,
  INR: 83.5,
  KRW: 1340,
  SGD: 1.35,
  HKD: 7.82,
  MXN: 17.2,
  BRL: 4.95,
  ARS: 870,
  CLP: 930,
  COP: 3950,
  PEN: 3.72,
  // African currencies
  XAF: 603,
  XOF: 603,
  NGN: 1580,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.5,
  EGP: 49,
  MAD: 10,
  TND: 3.12,
  CDF: 2800,
  AOA: 850,
  GNF: 8600,
  UGX: 3700,
  TZS: 2560,
  RWF: 1280,
  ETB: 57,
  MGA: 4500,
  ZMW: 26,
  MZN: 64,
  // Asian currencies
  VND: 25450,
  THB: 36,
  IDR: 15800,
  PHP: 57,
  MYR: 4.7,
  PKR: 280,
  BDT: 110,
  AED: 3.67,
  SAR: 3.75,
  // European currencies
  PLN: 4.0,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  CZK: 23.5,
  HUF: 365,
  RON: 4.6,
  BGN: 1.8,
  TRY: 32,
  RUB: 92,
  UAH: 41,
  // Caribbean/Other
  HTG: 132,
  DOP: 59,
  JMD: 156,
};

async function fetchLiveRates(): Promise<Record<string, number>> {
  // Use Frankfurter API (free, no API key required) with EUR as base
  // Then convert to USD base
  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=USD",
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch from Frankfurter");
    }
    
    const data = await response.json();
    const rates: Record<string, number> = { USD: 1, ...data.rates };
    
    // Frankfurter doesn't have all African currencies, so we'll use a secondary source
    // and merge with our fallback rates
    return { ...FALLBACK_RATES, ...rates };
  } catch (error) {
    console.error("Frankfurter API failed, trying backup...", error);
    
    // Try backup API (ExchangeRate-API free tier)
    try {
      const backupResponse = await fetch(
        "https://open.er-api.com/v6/latest/USD",
        { next: { revalidate: 3600 } }
      );
      
      if (!backupResponse.ok) {
        throw new Error("Backup API also failed");
      }
      
      const backupData = await backupResponse.json();
      return { ...FALLBACK_RATES, ...backupData.rates };
    } catch (backupError) {
      console.error("All APIs failed, using fallback rates", backupError);
      return FALLBACK_RATES;
    }
  }
}

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedRates && now - cachedRates.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        rates: cachedRates.rates,
        source: "cache",
        timestamp: cachedRates.timestamp,
        baseCurrency: "USD",
      });
    }

    // Fetch new rates
    const rates = await fetchLiveRates();
    
    // Update cache
    cachedRates = { rates, timestamp: now };

    return NextResponse.json({
      success: true,
      rates,
      source: "live",
      timestamp: now,
      baseCurrency: "USD",
    });
  } catch (error) {
    console.error("Exchange rate error:", error);
    
    // Return fallback rates on error
    return NextResponse.json({
      success: true,
      rates: FALLBACK_RATES,
      source: "fallback",
      timestamp: Date.now(),
      baseCurrency: "USD",
    });
  }
}

// POST endpoint to convert specific amounts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, from, to } = body;

    if (!amount || !from || !to) {
      return NextResponse.json(
        { error: "Missing required fields: amount, from, to" },
        { status: 400 }
      );
    }

    // Get rates
    const now = Date.now();
    let rates: Record<string, number>;
    
    if (cachedRates && now - cachedRates.timestamp < CACHE_TTL) {
      rates = cachedRates.rates;
    } else {
      rates = await fetchLiveRates();
      cachedRates = { rates, timestamp: now };
    }

    // Convert
    const fromRate = rates[from.toUpperCase()] || 1;
    const toRate = rates[to.toUpperCase()] || 1;
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    const result = usdAmount * toRate;

    return NextResponse.json({
      success: true,
      amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      result,
      rate: toRate / fromRate,
      timestamp: cachedRates?.timestamp || now,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Conversion failed" },
      { status: 500 }
    );
  }
}
