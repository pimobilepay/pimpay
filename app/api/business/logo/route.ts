import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas depasser 2MB" }, { status: 400 });
    }

    // Get user's business
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    const business = await prisma.business.findFirst({
      where: { email: user.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: 'pimpay/business-logos',
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Update business logo in database
    await prisma.business.update({
      where: { id: business.id },
      data: { logo: uploadResponse.secure_url }
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url
    });

  } catch (error: unknown) {
    console.error("BUSINESS_LOGO_UPLOAD_ERROR:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
