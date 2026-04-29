import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";

/**
 * Helper utilisable dans les routes qui n'ont pas accès à NextRequest
 * (ex: export async function GET() sans paramètre)
 * Retourne { error: NextResponse } si non autorisé, ou { admin: payload } si OK.
 */
export async function requireAdmin() {
  const payload = await getAuthPayload();
  if (!payload) {
    return { error: NextResponse.json({ error: "Authentification requise" }, { status: 401 }), admin: null };
  }
  if (payload.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Accès refusé : privilèges insuffisants" }, { status: 403 }), admin: null };
  }
  return { error: null, admin: payload };
}

/**
 * Helper pour les routes qui reçoivent NextRequest
 */
import { adminAuth } from "@/lib/adminAuth";
export async function requireAdminFromRequest(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) {
    return { error: NextResponse.json({ error: "Accès refusé - Protocole Elara" }, { status: 403 }), admin: null };
  }
  return { error: null, admin };
}
