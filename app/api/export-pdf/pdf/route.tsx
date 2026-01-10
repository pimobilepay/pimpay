export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
// @ts-ignore - On ignore les types si le paquet @types/pdfkit n'est pas détecté
import PDFDocument from "pdfkit";

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
    const arrayBuffer = await response.arrayBuffer();

    // 2. Création du PDF via une Promise
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      // Ajout de l'image au PDF
      try {
        // On convertit l'ArrayBuffer en Buffer pour PDFKit
        doc.image(Buffer.from(arrayBuffer), {
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
    // CORRECTION : On convertit le Buffer en Uint8Array pour NextResponse
    return new NextResponse(new Uint8Array(pdfBuffer), {
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
