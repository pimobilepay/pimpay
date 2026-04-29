import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Authentification depuis le token de session (jamais depuis le body)
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    // Validation du type MIME
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Seules les images sont acceptées" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: 'pimpay/avatars',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadResponse.secure_url },
      select: { id: true, avatar: true }
    });

    return NextResponse.json({ success: true, avatar: updatedUser.avatar });
  } catch (error: any) {
    console.error("[AVATAR_UPLOAD_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur lors du téléchargement" }, { status: 500 });
  }
}
