// ── Types ──────────────────────────────────────────────────────────────────────

export interface ZeroBounceResult {
  isValid: boolean;
  status: "valid" | "invalid" | "catch-all" | "spamtrap" | "abuse" | "do_not_mail" | "unknown" | "error" | "skipped";
  subStatus: string;
  isDisposable: boolean;
  freeEmail: boolean;
  message: string;
}

interface ZeroBounceAPIResponse {
  status: string;
  sub_status: string;
  free_email: boolean;
  did_you_mean: string | null;
  account: string;
  domain: string;
  domain_age_days: string;
  smtp_provider: string;
  mx_found: string;
  mx_record: string;
  firstname: string;
  lastname: string;
  gender: string;
  country: string | null;
  region: string | null;
  city: string | null;
  zipcode: string | null;
  processed_at: string;
}

// ── In-memory cache ────────────────────────────────────────────────────────────

const emailCache = new Map<string, { result: ZeroBounceResult; expiry: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedResult(email: string): ZeroBounceResult | null {
  const cached = emailCache.get(email.toLowerCase());
  if (cached && Date.now() < cached.expiry) {
    return cached.result;
  }
  if (cached) {
    emailCache.delete(email.toLowerCase());
  }
  return null;
}

function setCachedResult(email: string, result: ZeroBounceResult): void {
  // Keep cache size reasonable (max 500 entries)
  if (emailCache.size > 500) {
    const firstKey = emailCache.keys().next().value;
    if (firstKey) emailCache.delete(firstKey);
  }
  emailCache.set(email.toLowerCase(), { result, expiry: Date.now() + CACHE_TTL_MS });
}

// ── Disposable email sub-statuses ──────────────────────────────────────────────

const DISPOSABLE_SUB_STATUSES = new Set([
  "disposable",
  "toxic",
]);

const INVALID_STATUSES = new Set([
  "invalid",
  "spamtrap",
  "abuse",
  "do_not_mail",
]);

// ── Main function ──────────────────────────────────────────────────────────────

export async function verifyEmail(email: string): Promise<ZeroBounceResult> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;

  // If no API key configured, fail-open (allow the email)
  if (!apiKey) {
    console.warn("[ZeroBounce] ZEROBOUNCE_API_KEY is not set. Skipping email verification.");
    return {
      isValid: true,
      status: "skipped",
      subStatus: "no_api_key",
      isDisposable: false,
      freeEmail: false,
      message: "Email verification skipped (no API key configured)",
    };
  }

  // Check cache first
  const cached = getCachedResult(email);
  if (cached) {
    return cached;
  }

  const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`ZeroBounce API returned ${response.status}`);
    }

    const data: ZeroBounceAPIResponse = await response.json();

    const isDisposable = DISPOSABLE_SUB_STATUSES.has(data.sub_status?.toLowerCase() || "");
    const isInvalid = INVALID_STATUSES.has(data.status?.toLowerCase() || "");
    const isCatchAll = data.status?.toLowerCase() === "catch-all";
    const isValid = data.status?.toLowerCase() === "valid" || isCatchAll;

    let message = "";
    if (isDisposable) {
      message = "disposable";
    } else if (isInvalid) {
      message = "invalid";
    } else if (isValid) {
      message = "valid";
    } else {
      message = "unknown";
    }

    const result: ZeroBounceResult = {
      isValid: isValid && !isDisposable,
      status: data.status?.toLowerCase() as ZeroBounceResult["status"],
      subStatus: data.sub_status || "",
      isDisposable,
      freeEmail: data.free_email || false,
      message,
    };

    // Cache the result
    setCachedResult(email, result);

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAborted = error instanceof Error && error.name === "AbortError";

    console.error("[ZeroBounce] Error:", isAborted ? "Request timed out" : errorMessage);

    // Fail-open: if ZeroBounce is unreachable, allow the email
    return {
      isValid: true,
      status: "error",
      subStatus: isAborted ? "timeout" : "api_error",
      isDisposable: false,
      freeEmail: false,
      message: "error",
    };
  }
}
