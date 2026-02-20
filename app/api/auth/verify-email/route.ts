export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/zerobounce";

// ── Simple in-memory rate limiter ──────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes

// ── Basic email format validation ──────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── POST Handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic format check before calling the API
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

    // Call ZeroBounce
    const result = await verifyEmail(trimmedEmail);

    return NextResponse.json({
      isValid: result.isValid,
      status: result.status,
      subStatus: result.subStatus,
      isDisposable: result.isDisposable,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("[verify-email] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
