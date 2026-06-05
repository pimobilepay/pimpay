export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

// Lecture des versions réellement installées (et non celles déclarées dans package.json)
function readVersion(pkg: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const json = require(`${pkg}/package.json`);
    return json?.version ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Sécurité : réservé aux administrateurs
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Versions runtime réelles
  const nextVersion = readVersion("next");
  const prismaVersion = readVersion("@prisma/client") ?? readVersion("prisma");
  const reactVersion = readVersion("react");
  const nodeVersion = process.version; // ex: v20.x.x

  // Détection du fournisseur de base de données depuis l'URL de connexion
  const dbUrl = process.env.DATABASE_URL || "";
  let database = "Non configurée";
  if (dbUrl) {
    if (/neon\.tech/i.test(dbUrl)) database = "PostgreSQL (Neon)";
    else if (/supabase/i.test(dbUrl)) database = "PostgreSQL (Supabase)";
    else if (/^postgres(ql)?:\/\//i.test(dbUrl)) database = "PostgreSQL";
    else if (/^mysql:\/\//i.test(dbUrl)) database = "MySQL";
    else database = "Base SQL";
  }

  // Mode actuel + version déployée récupérés dynamiquement depuis la base
  let mode: "Maintenance" | "Coming Soon" | "Production" = "Production";
  let forceUpdate = false;
  let deployedVersion: string | null = null;
  let dbConnected = false;

  if (process.env.DATABASE_URL) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" },
        select: {
          appVersion: true,
          maintenanceMode: true,
          comingSoonMode: true,
          forceUpdate: true,
        },
      });
      dbConnected = true;
      if (config) {
        mode = config.maintenanceMode
          ? "Maintenance"
          : config.comingSoonMode
            ? "Coming Soon"
            : "Production";
        forceUpdate = config.forceUpdate;
        deployedVersion = config.appVersion;
      }
    } catch (err) {
      console.error("[SYSTEM_INFO_ERROR]:", err);
    }
  }

  return NextResponse.json({
    runtime: nextVersion ? `Next.js ${nextVersion} (App Router)` : "Next.js (App Router)",
    nextVersion,
    prismaVersion,
    reactVersion,
    nodeVersion,
    database,
    dbConnected,
    environment: process.env.NODE_ENV || "production",
    mode,
    forceUpdate,
    deployedVersion,
    serverTime: new Date().toISOString(),
  });
}
