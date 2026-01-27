export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

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
    
    // Pour jsPDF, on utilise le format Uint8Array directement
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 2. Création du PDF avec jsPDF
    // 'p' = portrait, 'mm' = millimètres, 'a4' = format
    const doc = new jsPDF('p', 'mm', 'a4');

    // Ajout de l'image
    // jsPDF détecte automatiquement le format (PNG, JPEG, etc.)
    // Paramètres : image, format, x, y, largeur, hauteur
    doc.addImage(uint8Array, "JPEG", 10, 10, 190, 0); 

    // 3. Génération du buffer de sortie
    const pdfOutput = doc.output("arraybuffer");

    // Retour de la réponse PDF
    return new NextResponse(new Uint8Array(pdfOutput), {
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
