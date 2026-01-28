import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

// Force le mode dynamique pour éviter les erreurs de build
export const dynamic = 'force-dynamic';

// Gestion propre du Singleton Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configuration Cloudinary avec vérification
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. Conversion du fichier en base64 (plus stable pour éviter les Timeouts de Stream)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // 2. Upload vers Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: 'pimpay/avatars',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // 3. Mise à jour de la base de données (Schéma User)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadResponse.secure_url },
      select: {
        id: true,
        avatar: true,
        username: true
      }
    });

    return NextResponse.json({
      success: true,
      avatar: updatedUser.avatar
    });

  } catch (error: any) {
    console.error("Erreur API Avatar:", error);
    // On renvoie l'erreur spécifique de Cloudinary si elle existe
    return NextResponse.json(
      { error: error.message || "Échec de l'upload" },
      { status: 500 }
    );
  }
}
