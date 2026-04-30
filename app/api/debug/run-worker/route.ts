export const dynamic = "force-dynamic";

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";

/**
 * SECURITY FIX [CRITIQUE] — Route debug/run-worker
 * Même logique que debug/transactions : clé obligatoire, bloqué en prod.
 */

function checkDebugAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const expectedKey = process.env.DEBUG_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: "DEBUG_API_KEY non configurée. Ajoutez-la dans .env.local." },
      { status: 503 }
    );
  }

  const apiKey = req.headers.get("x-debug-key");
  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  const authError = checkDebugAuth(req);
  if (authError) return authError;

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const workerResponse = await fetch(`${baseUrl}/api/worker/process`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const result = await workerResponse.json();
    console.log("[DEBUG] Résultat worker:", result);

    return NextResponse.json({
      success: true,
      message: "Worker déclenché avec succès",
      workerResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    // FIX: error.stack jamais dans la réponse
    const message = error instanceof Error ? getErrorMessage(error) : "Erreur interne";
    console.error("[DEBUG] ERREUR worker:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
