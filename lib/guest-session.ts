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
