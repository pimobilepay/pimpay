import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Route de déclenchement manuel du worker — BLOQUÉE EN PRODUCTION
 * Accessible uniquement en développement local.
 */
export async function GET(req: NextRequest) {
  // ✅ SÉCURITÉ CRITIQUE: Bloquer totalement en production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const apiKey = req.headers.get('x-debug-key');
  const expectedKey = process.env.DEBUG_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/worker/process`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );

  const result = await workerResponse.json();

  return NextResponse.json({
    success: true,
    message: 'Worker déclenché (dev uniquement)',
    workerResult: result,
    timestamp: new Date().toISOString(),
  });
}
