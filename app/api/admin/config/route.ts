export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Fonction utilitaire pour récupérer le modèle Prisma dynamiquement (ton code original)
const getConfigModel = () => {
  const db = prisma as any;
  return db.systemConfig || db.SystemConfig;
};

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const ConfigModel = getConfigModel();

    if (!ConfigModel) {
      console.error("ERREUR CRITIQUE : Le modèle SystemConfig est introuvable.");
      return NextResponse.json({ error: "Modèle manquant" }, { status: 500 });
    }

    // Récupération de la config unique
    let config = await ConfigModel.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    // Si elle n'existe pas, on la crée avec TOUS les champs (anciens + nouveaux)
    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          maintenanceMode: false,
          transactionFee: 0.01,
          minWithdrawal: 1.0,
          consensusPrice: 314159.0,
          globalAnnouncement: "Bienvenue sur PIMPAY CTRL.", // Nouveau
          totalVolumePi: 0, // Nouveau (pour les stats)
          lastBackupAt: new Date(), // Nouveau
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
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const ConfigModel = getConfigModel();

    // On prépare les données de mise à jour dynamiquement
    // Cela permet d'envoyer seulement une partie des données sans écraser le reste par du undefined
    const updateData: any = {};
    if (body.maintenanceMode !== undefined) updateData.maintenanceMode = body.maintenanceMode;
    if (body.transactionFee !== undefined) updateData.transactionFee = body.transactionFee;
    if (body.minWithdrawal !== undefined) updateData.minWithdrawal = body.minWithdrawal;
    if (body.consensusPrice !== undefined) updateData.consensusPrice = body.consensusPrice;
    if (body.globalAnnouncement !== undefined) updateData.globalAnnouncement = body.globalAnnouncement;
    if (body.action === "BACKUP_DB") updateData.lastBackupAt = new Date();

    const updatedConfig = await ConfigModel.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: updateData,
      create: {
        id: "GLOBAL_CONFIG",
        maintenanceMode: body.maintenanceMode || false,
        transactionFee: body.transactionFee || 0.01,
        minWithdrawal: body.minWithdrawal || 1.0,
        consensusPrice: body.consensusPrice || 314159.0,
        globalAnnouncement: body.globalAnnouncement || "Système stable",
        totalVolumePi: 0,
        lastBackupAt: new Date(),
      }
    });

    // --- LOGIQUE COOKIE MAINTENANCE (Pour ton Middleware) ---
    const response = NextResponse.json(updatedConfig);
    
    if (body.maintenanceMode !== undefined) {
      if (body.maintenanceMode) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        });
      } else {
        response.cookies.delete("maintenance_mode");
      }
    }

    return response;
  } catch (error: any) {
    console.error("CONFIG_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
