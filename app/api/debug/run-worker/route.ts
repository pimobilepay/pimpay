export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Endpoint pour déclencher manuellement le worker
 * Utile pour le diagnostic et les tests
 */
export async function GET(req: NextRequest) {
  try {
    // Optionnel: Verifier une clé API pour la securite
    const apiKey = req.headers.get('x-debug-key');
    const expectedKey = process.env.DEBUG_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[v0] [DEBUG] Declenchement manuel du worker...");
    
    // Appeler le worker
    const workerResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/worker/process`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const result = await workerResponse.json();

    console.log("[v0] [DEBUG] Resultat du worker:", result);

    return NextResponse.json({
      success: true,
      message: "Worker déclenché avec succès",
      workerResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("[v0] [DEBUG] ERREUR lors du declenchement du worker:", error.message);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
