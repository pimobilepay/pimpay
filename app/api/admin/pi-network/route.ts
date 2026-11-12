export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";
import { getPiNetwork, getPiNetworkConfig, verifyPiHorizonNetwork, type PiNetwork } from "@/lib/pi";

function networkDetails(network: PiNetwork) {
  return {
    network,
    horizonUrl: `https://api.${network}.minepi.com`,
    passphrase: network === "mainnet" ? "Pi Network" : "Pi Testnet",
    sandbox: network === "testnet",
  };
}

export async function GET(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const network = await getPiNetwork();
    const ready = await getPiNetworkConfig(network)
      .then(verifyPiHorizonNetwork)
      .then(() => true)
      .catch(() => false);
    return NextResponse.json({ ...networkDetails(network), ready });
  } catch {
    return NextResponse.json({ error: "Configuration Pi indisponible" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: { network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const network = body.network;
  if (network !== "testnet" && network !== "mainnet") {
    return NextResponse.json({ error: 'Valeur attendue: "testnet" ou "mainnet"' }, { status: 400 });
  }

  let previous: PiNetwork;
  try {
    previous = await getPiNetwork();
  } catch {
    return NextResponse.json({ error: "Configuration Pi indisponible" }, { status: 503 });
  }

  if (previous === network) {
    const ready = await getPiNetworkConfig(network)
      .then(verifyPiHorizonNetwork)
      .then(() => true)
      .catch(() => false);
    return NextResponse.json({ ...networkDetails(network), ready, changed: false });
  }

  try {
    await verifyPiHorizonNetwork(await getPiNetworkConfig(network));
  } catch {
    return NextResponse.json(
      { error: `Les variables Pi existantes ne correspondent pas à ${network}. Aucun changement effectué.` },
      { status: 409 }
    );
  }

  const [fundedWallet, pendingPiTransaction] = await Promise.all([
    prisma.wallet.findFirst({
      where: { currency: "PI", balance: { not: 0 } },
      select: { id: true },
    }),
    prisma.transaction.findFirst({
      where: {
        currency: { in: ["PI", "PIM"] },
        OR: [
          { status: "PENDING" },
          { statusClass: { in: ["QUEUED", "PROCESSING", "RETRY"] } },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (fundedWallet || pendingPiTransaction) {
    return NextResponse.json(
      {
        error: "Basculement refusé: videz tous les soldes PI et terminez les opérations Pi en attente avant de changer de réseau.",
      },
      { status: 409 }
    );
  }

  try {
    await prisma.systemConfig.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: { piNetwork: network },
      create: { id: "GLOBAL_CONFIG", piNetwork: network },
    });
  } catch {
    return NextResponse.json(
      { error: "Le réseau n'a pas été changé: impossible de persister la configuration." },
      { status: 503 }
    );
  }

  try {
    await logSystemEvent({
      level: "INFO",
      source: "ADMIN_PI_NETWORK",
      action: "NETWORK_SWITCHED",
      message: `Réseau Pi basculé: ${previous} → ${network}`,
      details: { previous, network, adminId: (auth as any)?.id },
    });
  } catch {
    // Le changement est déjà persisté; l'échec de journalisation ne doit pas le masquer.
  }

  return NextResponse.json({
    ...networkDetails(network),
    ready: true,
    changed: true,
    message: `Réseau Pi basculé sur ${network === "mainnet" ? "MAINNET" : "TESTNET"}`,
  });
}
