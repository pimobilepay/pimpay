export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pi-network  (PUBLIC, lecture seule)
 *
 * Expose le mode reseau Pi configure par l'admin (testnet | mainnet) afin que
 * le SDK Pi cote client soit initialise avec la bonne valeur `sandbox`.
 *
 *  - testnet  -> sandbox: true   (mode developpement / sandbox.minepi.com)
 *  - mainnet  -> sandbox: false  (mode production, Pi Browser uniquement)
 *
 * Source de verite : SystemConfig.piNetwork (modifiable depuis
 * Admin -> Reglages -> Politique Monetaire). Aucune donnee sensible n'est
 * exposee : uniquement le mode reseau et le flag sandbox.
 */
type PiNetwork = "testnet" | "mainnet";

const CONFIG_KEY = "GLOBAL_CONFIG";

async function getCurrentNetwork(): Promise<PiNetwork> {
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: CONFIG_KEY },
      select: { piNetwork: true } as any,
    });
    const val = (cfg as any)?.piNetwork;
    return val === "mainnet" ? "mainnet" : "testnet";
  } catch {
    return process.env.PI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  }
}

export async function GET() {
  const network = await getCurrentNetwork();
  const sandbox = network !== "mainnet";

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
      // Cache court : le mode change rarement, mais doit se propager vite
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    }
  );
}
