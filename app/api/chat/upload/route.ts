import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Mode dynamique : on manipule un upload de fichier en runtime.
export const dynamic = "force-dynamic";

// Configuration Cloudinary (memes variables que les autres uploads de l'app)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
const MIN_BYTES = 100; // un fichier image valide fait toujours > 100 octets

// ---------------------------------------------------------------------------
// SECURITE ANTI-ATTAQUE PAR UPLOAD
// ---------------------------------------------------------------------------
// 1. Liste blanche stricte des types MIME autorises (jamais de SVG : vecteur
//    classique d'attaque XSS car un .svg peut contenir du <script>).
// 2. Verification de la "signature" binaire reelle du fichier (magic bytes),
//    pour qu'un fichier malveillant (ex: .php renomme .jpg) soit rejete meme
//    si son extension / Content-Type ment.
// 3. Limite de taille (min + max) et de cadence (rate limit par IP).
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Verifie les premiers octets du fichier pour confirmer que c'est bien
// une image du type annonce. Retourne le format detecte ou null.
function detectImageSignature(buf: Buffer): "jpeg" | "png" | "gif" | "webp" | null {
  if (buf.length < 12) return null;

  // JPEG : FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";

  // GIF : "GIF87a" ou "GIF89a"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";

  // WEBP : "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";

  return null;
}

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

    // 1. Liste blanche du type MIME declare.
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Format non autorise. Images JPG, PNG, WEBP ou GIF uniquement." },
        { status: 400 },
      );
    }

    // 2. Taille (min + max).
    if (file.size < MIN_BYTES) {
      return NextResponse.json({ error: "Fichier invalide ou vide" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (max 10 Mo)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Verification de la signature binaire reelle (magic bytes).
    const signature = detectImageSignature(buffer);
    if (!signature) {
      return NextResponse.json(
        { error: "Le contenu du fichier n'est pas une image valide." },
        { status: 400 },
      );
    }

    // 4. Coherence entre le type declare et le contenu reel
    //    (ex: un .gif annonce "image/png" est rejete).
    const mimeMatchesSignature =
      (signature === "jpeg" && file.type === "image/jpeg") ||
      (signature === "png" && file.type === "image/png") ||
      (signature === "gif" && file.type === "image/gif") ||
      (signature === "webp" && file.type === "image/webp");
    if (!mimeMatchesSignature) {
      return NextResponse.json(
        { error: "Type de fichier incoherent. Envoi refuse." },
        { status: 400 },
      );
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
