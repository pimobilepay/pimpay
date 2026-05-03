export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * #11 FIX: Secret transmis en POST body (plus en query param visible dans les logs).
 * L'ancien GET /api/unlock?secret=... est supprimé.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || secret !== process.env.ADMIN_BYPASS_TOKEN) {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_bypass", "true", {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "strict",
    });

    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse("Accès refusé", { status: 403 });
  }
}

// GET supprimé — secret ne doit jamais transiter en query parameter
export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
