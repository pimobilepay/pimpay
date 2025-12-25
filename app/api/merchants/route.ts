import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const category = searchParams.get("category");

    // Construction du filtre dynamique
    const where: any = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (category) where.category = category;

    const merchants = await prisma.merchant.findMany({
      where,
      orderBy: { rating: 'desc' }
    });

    return NextResponse.json(merchants);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la récupération des marchands" }, { status: 500 });
  }
}

// Route pour ajouter un nouveau marchand sur la carte
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, address, latitude, longitude, city, country } = body;

    if (!name || !latitude || !longitude) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const merchant = await prisma.merchant.create({
      data: {
        name,
        category,
        address,
        city,
        country,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isVerified: false
      }
    });

    return NextResponse.json({ success: true, merchant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
