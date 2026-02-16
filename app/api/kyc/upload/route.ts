import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Champs autorisés pour la mise à jour dans la table User
const ALLOWED_FIELDS = ["kycFrontUrl", "kycBackUrl", "kycSelfieUrl"] as const;
type KycField = typeof ALLOWED_FIELDS[number];

function isAllowedField(field: string): field is KycField {
  return ALLOWED_FIELDS.includes(field as KycField);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const type = formData.get('type') as string | null;

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: "Donnees manquantes (file, userId ou type)" },
        { status: 400 }
      );
    }

    // Validation du champ
    if (!isAllowedField(type)) {
      return NextResponse.json(
        { error: "Type de document non autorise" },
        { status: 400 }
      );
    }

    // Verification que l'utilisateur existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Validation taille fichier (max 10 MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 MB)" },
        { status: 400 }
      );
    }

    // Validation type MIME
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format non supporte. Utilisez JPEG, PNG ou WebP" },
        { status: 400 }
      );
    }

    // Conversion en base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload vers Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: `pimpay/kyc/${userId}`,
      public_id: `${type}_${Date.now()}`,
      tags: ['kyc_document', userId],
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' }
      ]
    });

    // CORRECTION CRITIQUE : Enregistrer immediatement l'URL dans la base de donnees
    await prisma.user.update({
      where: { id: userId },
      data: {
        [type]: uploadResponse.secure_url,
      }
    });

    // Log de securite
    await prisma.securityLog.create({
      data: {
        userId,
        action: `KYC_UPLOAD_${type.replace('kyc', '').replace('Url', '').toUpperCase()}`,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        device: request.headers.get("user-agent") || "unknown",
      }
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      field: type,
      savedToDb: true,
    });

  } catch (error: any) {
    console.error("Erreur API KYC Upload:", error);
    return NextResponse.json(
      { error: error.message || "Echec de l'upload" },
      { status: 500 }
    );
  }
}
