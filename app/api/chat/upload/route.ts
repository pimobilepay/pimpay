import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateImageUpload } from "@/lib/upload-security";

// Mode dynamique : on manipule un upload de fichier en runtime.
export const dynamic = "force-dynamic";

// Configuration Cloudinary (memes variables que les autres uploads de l'app)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // --- Rate limit : max 8 uploads / 60s par IP (anti-flood / DoS) ---
    const ip = getClientIp(request);
    const { limited } = checkRateLimit(`chat-upload:${ip}`, 8, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Trop d'envois. Patientez une minute avant de reessayer." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validation de securite complete : taille -> liste blanche MIME ->
    // signature binaire reelle -> coherence -> scan anti-virus / anti-payload
    // (executables embarques, scripts injectes, polyglots, EICAR...).
    const validation = validateImageUpload(file.type, file.size, buffer);
    if (!validation.ok) {
      console.warn(`CHAT_UPLOAD_BLOCKED ip=${ip} mime=${file.type} size=${file.size} -> ${validation.error}`);
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Conversion en base64 (plus stable que les streams pour eviter les timeouts).
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload vers Cloudinary, dans un dossier dedie aux pieces jointes du chat.
    // `resource_type: "image"` force Cloudinary a refuser tout ce qui n'est pas
    // une image, en double securite cote fournisseur.
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "pimpay/chat",
      resource_type: "image",
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
