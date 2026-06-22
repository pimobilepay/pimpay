export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PiNetwork = "testnet" | "mainnet";

const CONFIG_KEY = "GLOBAL_CONFIG";

async function getCurrentNetwork(): Promise<PiNetwork> {
  // On lit la variable exacte présente sur ton Vercel
  const v0Env = process.env.PI_NETWORK_PHRASE;
  
  if (v0Env === "mainnet") return "mainnet";
  if (v0Env === "testnet") return "testnet";

  // Fallback sur la base de données si la variable Vercel n'est pas lue
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: CONFIG_KEY },
      select: { piNetwork: true } as any,
    });
    const val = (cfg as any)?.piNetwork;
    return val === "mainnet" ? "mainnet" : "testnet";
  } catch (error) {
    console.error("[PimPay API] Erreur Prisma, fallback sur testnet:", error);
    return "testnet";
  }
}

export async function GET(request: Request) {
  const network = await getCurrentNetwork();
  const sandbox = network !== "mainnet";
  const origin = request.headers.get("origin") || "*";

  return NextResponse.json(
    {
      network,
      sandbox,
      horizonUrl:
        network === "mainnet"
          ? "https://api.mainnet.minepi.com"
          : "https://api.testnet.minepi.com",
      passphrase: network === "mainnet" ? "Pi Network" : "Pi Testnet",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    }
  );
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

