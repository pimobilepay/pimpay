import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // Ou ta méthode de vérification de token

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const type = searchParams.get("type"); // front, back, ou selfie

    // 1. Vérification du Token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Upload vers Vercel Blob
    if (!request.body || !filename) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const blob = await put(filename, request.body, {
      access: "public", // Les URLs seront privées via la logique métier
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("UPLOAD_ERROR:", error);
    return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
  }
}
