import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

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
    // [FIX] Authentification obligatoire — l'ancienne version prenait le
    // `userId` cible directement dans le formulaire envoyé par le client,
    // ce qui permettait à n'importe qui de changer l'avatar de n'importe
    // quel compte. On utilise désormais l'utilisateur de la session, jamais
    // une valeur fournie par l'appelant.
    const session = await auth() as { id?: string } | null;
    const userId = session?.id;
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    // [FIX] Restriction de type et de taille — l'ancienne version acceptait
    // n'importe quel fichier sans limite, transformant l'endpoint en proxy
    // d'upload public vers le compte Cloudinary de l'app.
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format d'image non supporté" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image trop volumineuse (5 Mo max)" }, { status: 400 });
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

    // 3. Mise à jour de la base de données (Schéma User) — userId de la session, jamais du body
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
