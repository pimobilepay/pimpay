export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// --- POST : UPLOAD DE L'IMAGE D'ANNONCE (PNG) ---
export async function POST(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Validation du type (PNG en priorite, autres images acceptees)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
    }

    // Validation de la taille (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas depasser 4MB" }, { status: 400 });
    }

    // Conversion en base64 (stable pour eviter les timeouts de stream)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload vers Cloudinary (preserve la transparence PNG)
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "pimpay/announcements",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
    });
  } catch (error: any) {
    console.error("ANNOUNCEMENT_IMAGE_UPLOAD_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Echec de l'upload" },
      { status: 500 }
    );
  }
}

// --- DELETE : SUPPRESSION DE L'IMAGE D'ANNONCE ---
export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    await prisma.systemConfig.update({
      where: { id: "GLOBAL_CONFIG" },
      data: { announcementImage: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ANNOUNCEMENT_IMAGE_DELETE_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Echec de la suppression" },
      { status: 500 }
    );
  }
}
