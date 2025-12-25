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

    // Détection dynamique du modèle (Prisma change parfois la casse)
    const db = prisma as any;
    const ConfigModel = db.systemConfig || db.SystemConfig;

    if (!ConfigModel) {
      console.error("ERREUR CRITIQUE : Le modèle SystemConfig est introuvable dans Prisma.");
      return NextResponse.json({ 
        error: "Modèle manquant", 
        help: "Lancez 'npx prisma generate && npx prisma db push'" 
      }, { status: 500 });
    }

    // Récupération avec l'ID défini dans ton schéma
    let config = await ConfigModel.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    if (!config) {
      config = await ConfigModel.create({
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const db = prisma as any;
    const ConfigModel = db.systemConfig || db.SystemConfig;

    const updatedConfig = await ConfigModel.upsert({
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
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
