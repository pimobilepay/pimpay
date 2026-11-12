import { NextResponse } from "next/server";
import { getPiNetwork, getPiNetworkConfig, verifyPiHorizonNetwork } from "@/lib/pi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPiNetworkConfig();
    await verifyPiHorizonNetwork(config);
    return NextResponse.json(
      {
        network: config.network,
        sandbox: config.sandbox,
        ready: true,
        horizonUrl: config.horizonUrl,
        passphrase: config.passphrase,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    const network = await getPiNetwork().catch(() => null);
    return NextResponse.json(
      {
        network,
        sandbox: network === "testnet",
        ready: false,
        error: "La configuration Pi ne correspond pas au réseau sélectionné.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
