export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";

/**
 * GET /api/admin/pi-network
 * Retourne le réseau Pi actuel (testnet | mainnet) stocké en DB.
 *
 * POST /api/admin/pi-network
 * { network: "testnet" | "mainnet" }
 * Bascule le réseau Pi et met à jour PI_NETWORK en DB (SystemConfig).
 *
 * Les fichiers backend (external-transfer, worker) lisent PI_NETWORK
 * via process.env.PI_NETWORK au démarrage. Pour appliquer le changement
 * sans redéploiement, la valeur est également persistée dans SystemConfig
 * et tous les modules qui en ont besoin peuvent la lire via getSystemConfig().
 */

const CONFIG_KEY = "GLOBAL_CONFIG";

type PiNetwork = "testnet" | "mainnet";

async function getCurrentNetwork(): Promise<PiNetwork> {
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: CONFIG_KEY },
      select: { piNetwork: true } as any,
    });
    const val = (cfg as any)?.piNetwork;
    return val === "mainnet" ? "mainnet" : "testnet";
  } catch {
    // Si la colonne n'existe pas encore, fallback sur la variable d'env
    return (process.env.PI_NETWORK === "mainnet" ? "mainnet" : "testnet");
  }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const network = await getCurrentNetwork();

  return NextResponse.json({
    network,
    horizonUrl:
      network === "mainnet"
        ? "https://api.mainnet.minepi.com"
        : "https://api.testnet.minepi.com",
    passphrase: network === "mainnet" ? "Pi Network" : "Pi Testnet",
    sandbox: network !== "mainnet",
  });
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await adminAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { network } = body;

  if (network !== "testnet" && network !== "mainnet") {
    return NextResponse.json(
      { error: 'Valeur invalide — "testnet" ou "mainnet" attendu' },
      { status: 400 }
    );
  }

  const previous = await getCurrentNetwork();

  if (previous === network) {
    return NextResponse.json({
      network,
      message: "Réseau déjà configuré sur " + network,
      changed: false,
    });
  }

  // Persister dans SystemConfig (upsert)
  try {
    await (prisma.systemConfig as any).upsert({
      where: { id: CONFIG_KEY },
      update: { piNetwork: network },
      create: { id: CONFIG_KEY, piNetwork: network },
    });
  } catch (err: any) {
    // La colonne piNetwork n'existe peut-être pas encore en DB —
    // on log l'avertissement mais on continue (la valeur sera lue via process.env)
    console.warn("[pi-network] Impossible de persister piNetwork en DB:", err.message);
    await logSystemEvent({
      level: "WARN",
      source: "ADMIN_PI_NETWORK",
      action: "DB_PERSIST_FAILED",
      message: `Impossible de persister piNetwork="${network}" en DB: ${err.message}`,
      details: { network, error: err.message },
    });
  }

  // Mettre à jour process.env en mémoire pour les appels dans ce même processus
  // (Vercel / Node.js — sans redéploiement, la valeur sera active immédiatement
  // pour les requêtes suivantes dans ce worker)
  process.env.PI_NETWORK = network;

  await logSystemEvent({
    level: "INFO",
    source: "ADMIN_PI_NETWORK",
    action: "NETWORK_SWITCHED",
    message: `Réseau Pi basculé: ${previous} → ${network}`,
    details: {
      previous,
      network,
      horizonUrl:
        network === "mainnet"
          ? "https://api.mainnet.minepi.com"
          : "https://api.testnet.minepi.com",
      passphrase: network === "mainnet" ? "Pi Network" : "Pi Testnet",
      adminId: (auth as any)?.id,
    },
  });

  return NextResponse.json({
    network,
    horizonUrl:
      network === "mainnet"
        ? "https://api.mainnet.minepi.com"
        : "https://api.testnet.minepi.com",
    passphrase: network === "mainnet" ? "Pi Network" : "Pi Testnet",
    sandbox: network !== "mainnet",
    changed: true,
    message: `Réseau Pi basculé sur ${network === "mainnet" ? "MAINNET" : "TESTNET"} avec succès`,
  });
}
