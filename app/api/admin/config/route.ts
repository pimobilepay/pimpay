export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Utilisation du nom exact du modèle : systemConfig (Prisma transforme les noms de modèles en camelCase)
    // On cherche l'ID fixe défini dans ton schéma : "GLOBAL_CONFIG"
    let config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    // Initialisation si la table est vide
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          id: "GLOBAL_CONFIG",
          maintenanceMode: false,
          transactionFee: 0.01,
          minWithdrawal: 1.0,
          consensusPrice: 314159.0
        }
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();

    // Mise à jour ou création forcée sur l'ID "GLOBAL_CONFIG"
    const updatedConfig = await prisma.systemConfig.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: {
        maintenanceMode: body.maintenanceMode,
        transactionFee: body.transactionFee,
        minWithdrawal: body.minWithdrawal,
        consensusPrice: body.consensusPrice,
      },
      create: {
        id: "GLOBAL_CONFIG",
        maintenanceMode: body.maintenanceMode || false,
        transactionFee: body.transactionFee || 0.01,
        minWithdrawal: body.minWithdrawal || 1.0,
        consensusPrice: body.consensusPrice || 314159.0
      }
    });

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error("CONFIG_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
