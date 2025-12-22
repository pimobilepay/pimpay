export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

// Note: Dans Node.js 18+ (Vercel), 'fetch' est natif. 
// Pas besoin d'importer 'node-fetch' sauf si vous avez des besoins spécifiques.

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("image");

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 });
    }

    // 1. Récupération de l'image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    const imageBuffer = await response.arrayBuffer();

    // 2. Création du PDF via une Promise pour gérer l'asynchronisme de PDFKit
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: "A4",
        margin: 50 
      });
      
      const chunks: Buffer[] = [];

      // Collecte des morceaux de données
      doc.on("data", (chunk) => chunks.push(chunk));
      
      // Une fois terminé, on concatène tout en un seul Buffer
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      
      // En cas d'erreur lors de la génération
      doc.on("error", (err) => reject(err));

      // Ajout de l'image au PDF
      try {
        doc.image(Buffer.from(imageBuffer), {
          fit: [500, 700],
          align: "center",
          valign: "center",
        });
        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // 3. Retour de la réponse PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=pimpay-receipt.pdf",
      },
    });

  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
