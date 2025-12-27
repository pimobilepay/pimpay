export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Utilitaire sécurisé pour accéder au modèle selon la casse générée par Prisma
const getConfigModel = () => {
  return (prisma as any).systemConfig;
};

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const ConfigModel = getConfigModel();

    // Récupération de la config unique
    let config = await ConfigModel.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    // Si elle n'existe pas, on la crée avec les champs STRICTEMENT présents dans le schéma
    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          maintenanceMode: false,
          transactionFee: 0.01,
          // Note: minWithdrawal n'est pas dans ton schéma envoyé précédemment, 
          // je l'ajoute seulement si tu as fait le 'db push' suggéré avant.
          // Sinon, Prisma plantera ici.
        }
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération de la configuration" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const ConfigModel = getConfigModel();

    // On prépare les données de mise à jour en fonction de ton schéma actuel
    const updateData: any = {};
    if (body.maintenanceMode !== undefined) updateData.maintenanceMode = body.maintenanceMode;
    if (body.transactionFee !== undefined) updateData.transactionFee = parseFloat(body.transactionFee);

    // Si tu as ajouté ces champs via db push, décommente les lignes suivantes :
    // if (body.minWithdrawal !== undefined) updateData.minWithdrawal = parseFloat(body.minWithdrawal);

    const updatedConfig = await ConfigModel.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: updateData,
      create: {
        id: "GLOBAL_CONFIG",
        maintenanceMode: body.maintenanceMode || false,
        transactionFee: body.transactionFee || 0.01,
      }
    });

    // --- LOGIQUE COOKIE MAINTENANCE ---
    const response = NextResponse.json(updatedConfig);

    if (body.maintenanceMode !== undefined) {
      if (body.maintenanceMode) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false, // Permet au client de le lire pour l'UI
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 1 semaine
        });
      } else {
        response.cookies.delete("maintenance_mode");
      }
    }

    return response;
  } catch (error: any) {
    console.error("CONFIG_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur de mise à jour de la configuration" }, { status: 500 });
  }
}
