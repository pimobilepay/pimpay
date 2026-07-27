/**
 * Format partage du QR code utilisateur PIMOBIPAY.
 * Le QR encode un payload JSON pour permettre a un agent d'identifier
 * un client et d'effectuer un cash-in / cash-out.
 */

export interface PimpayUserQR {
  app: "PIMOBIPAY";
  type: "user";
  id: string;
  name?: string;
  username?: string;
}

/**
 * Construit la valeur textuelle a encoder dans le QR code du profil.
 */
export function buildUserQRValue(user: {
  id: string;
  name?: string;
  username?: string;
}): string {
  const payload: PimpayUserQR = {
    app: "PIMOBIPAY",
    type: "user",
    id: user.id,
    name: user.name,
    username: user.username,
  };
  return JSON.stringify(payload);
}

/**
 * Analyse la valeur scannee et retourne l'id du client (ou null).
 * Accepte le payload JSON PIMOBIPAY ou un id brut en fallback.
 */
export function parseUserQRValue(
  raw: string
): { id: string; name?: string; username?: string } | null {
  if (!raw) return null;
  const value = raw.trim();

  // 1. Essayer de parser le payload JSON
  try {
    const parsed = JSON.parse(value) as Partial<PimpayUserQR>;
    if (parsed && parsed.type === "user" && typeof parsed.id === "string" && parsed.id) {
      return { id: parsed.id, name: parsed.name, username: parsed.username };
    }
  } catch {
    // pas du JSON, on continue vers le fallback
  }

  // 2. Fallback: certains QR peuvent contenir un id brut (cuid) ou "pimpay:<id>"
  const prefixed = value.match(/^pimpay[:/]+(.+)$/i);
  if (prefixed?.[1]) {
    return { id: prefixed[1].trim() };
  }

  // 3. Id brut simple (sans espace)
  if (/^[a-z0-9_-]{6,}$/i.test(value)) {
    return { id: value };
  }

  return null;
}
