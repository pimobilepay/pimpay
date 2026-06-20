import { cookies } from "next/headers";

// Cookie qui identifie de façon stable un visiteur NON connecté, afin que
// chaque invité ne voie QUE ses propres conversations (et jamais celles des
// autres invités). Ce n'est pas une authentification — juste un identifiant
// d'appareil opaque et imprévisible.
export const GUEST_COOKIE = "pimpay_guest_id";

export async function readGuestId(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(GUEST_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export function newGuestId(): string {
  return "guest_" + crypto.randomUUID().replace(/-/g, "");
}

export function guestCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
  };
}

// --- Détection légère de l'appareil à partir du User-Agent (sans dépendance) --
export function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/opera|opr/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  return "Autre";
}

export function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Autre";
}

export function detectDevice(ua: string): string {
  return /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop";
}
