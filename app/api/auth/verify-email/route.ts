export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// ── Basic email format validation ──────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── POST Handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Simple format validation only (no external verification)
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        {
          isValid: false,
          status: "invalid",
          message: "invalid_format",
          code: "INVALID_FORMAT",
        },
        { status: 200 }
      );
    }

    // Email format is valid - no external verification needed
    return NextResponse.json({
      isValid: true,
      status: "valid",
      isDisposable: false,
      message: "Email format valid",
    });
  } catch (error: unknown) {
    console.error("[verify-email] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
