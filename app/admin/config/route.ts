import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET() {
  try {
    // 1. Vérification de sécurité (Optionnel mais recommandé)
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. Récupération simplifiée
    // Maintenant que la colonne 'maxWithdrawal' existe en DB, 
    // findFirst() récupérera tout sans erreur P2022.
    const config = await prisma.systemConfig.findFirst();

    if (!config) {
      // Si aucune config n'existe, on en crée une par défaut pour éviter le crash
      const defaultConfig = await prisma.systemConfig.create({
        data: {
          maintenanceMode: false,
          transactionFee: 0.01,
          minWithdrawal: 1,
          maxWithdrawal: 1000,
          consensusPrice: 314159,
          stakingAPY: 15,
        }
      });
      return NextResponse.json(defaultConfig);
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error.message);
    return NextResponse.json({ 
      error: "Erreur de configuration",
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // On récupère l'ID de la config existante
    const currentConfig = await prisma.systemConfig.findFirst();

    if (!currentConfig) {
      const newConfig = await prisma.systemConfig.create({ data: body });
      return NextResponse.json({ success: true, config: newConfig });
    }

    // Mise à jour globale avec toutes les données du body (y compris maxWithdrawal)
    const updatedConfig = await prisma.systemConfig.update({
      where: { id: currentConfig.id },
      data: body
    });

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error: any) {
    console.error("CONFIG_UPDATE_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
