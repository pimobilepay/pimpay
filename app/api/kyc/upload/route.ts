import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME, // Vérifie bien ces noms dans ton .env
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const type = formData.get('type') as string | null; // ex: kycFrontUrl

    if (!file || !userId || !type) {
      return NextResponse.json({ error: "Données manquantes (file, userId ou type)" }, { status: 400 });
    }

    // 1. Conversion en base64 pour la stabilité
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // 2. Upload vers Cloudinary (Dossier structuré par utilisateur)
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: `pimpay/kyc/${userId}`,
      public_id: `${type}_${Date.now()}`,
      tags: ['kyc_document', userId]
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url
    });

  } catch (error: any) {
    console.error("Erreur API KYC Upload:", error);
    return NextResponse.json({ error: error.message || "Échec de l'upload" }, { status: 500 });
  }
}
