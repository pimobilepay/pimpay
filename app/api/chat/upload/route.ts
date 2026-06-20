import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Mode dynamique : on manipule un upload de fichier en runtime.
export const dynamic = "force-dynamic";

// Configuration Cloudinary (memes variables que les autres uploads de l'app)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // On accepte uniquement les images.
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)" }, { status: 400 });
    }

    // Conversion en base64 (plus stable que les streams pour eviter les timeouts).
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload vers Cloudinary, dans un dossier dedie aux pieces jointes du chat.
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "pimpay/chat",
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return NextResponse.json({ success: true, url: uploadResponse.secure_url });
  } catch (error: any) {
    console.error("CHAT_UPLOAD_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Echec de l'upload" },
      { status: 500 },
    );
  }
}
