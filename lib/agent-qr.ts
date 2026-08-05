/**
 * Format partage du QR code utilisateur PIMOBIPAY.
 *
 * Le QR encode un payload JSON contenant l'identite du porteur du compte
 * (utilisateur standard OU agent) afin qu'un agent puisse, apres scan,
 * identifier immediatement son interlocuteur et lancer un depot (cash-in)
 * ou un retrait (cash-out) sans ressaisie.
 *
 * Les donnees encodees restent volontairement limitees aux informations
 * necessaires a l'operation de caisse : nom, prenom, username, telephone,
 * e-mail. Aucune donnee sensible (PIN, solde, document d'identite) n'est
 * jamais placee dans le QR : le solde et le KYC sont toujours re-verifies
 * cote serveur via /api/agent/customer.
 */

export interface PimpayUserQR {
  app: "PIMOBIPAY"
  type: "user"
  /** Version du format, pour rester compatible avec les anciens QR. */
  v?: number
  id: string
  name?: string
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
  email?: string
  /** USER | AGENT | ADMIN... permet d'afficher un badge agent au scan. */
  role?: string
  /** Identifiant agent (si le porteur est un agent PIMOBIPAY). */
  agentId?: string
}

/** Identite resolue apres analyse d'un QR (ou d'un identifiant brut). */
export interface ParsedUserQR {
  id?: string
  name?: string
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
  email?: string
  role?: string
  agentId?: string
  /** Terme a utiliser pour la recherche serveur si l'id est absent. */
  searchTerm?: string
}

function clean(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Construit la valeur textuelle a encoder dans le QR code du profil.
 * Fonctionne pour les utilisateurs comme pour les agents.
 */
export function buildUserQRValue(user: {
  id: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  phone?: string | null
  email?: string | null
  role?: string | null
  agentId?: string | null
}): string {
  const payload: PimpayUserQR = {
    app: "PIMOBIPAY",
    type: "user",
    v: 2,
    id: user.id,
    name:
      clean(user.name) ||
      [clean(user.firstName), clean(user.lastName)].filter(Boolean).join(" ") ||
      undefined,
    firstName: clean(user.firstName),
    lastName: clean(user.lastName),
    username: clean(user.username),
    phone: clean(user.phone),
    email: clean(user.email),
    role: clean(user.role),
    agentId: clean(user.agentId),
  }

  // Retire les cles vides pour garder le QR le plus dense possible.
  const compact = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined && v !== "")
  )

  return JSON.stringify(compact)
}

/**
 * Analyse la valeur scannee et retourne l'identite du porteur.
 *
 * Accepte, par ordre de priorite :
 *  1. le payload JSON PIMOBIPAY (v1 ou v2),
 *  2. un lien de parrainage/profil PIMOBIPAY (`...?ref=CODE`, `/u/<code>`),
 *  3. `pimpay:<id>`,
 *  4. un identifiant brut (cuid, username, telephone, e-mail).
 */
export function parseUserQRValue(raw: string): ParsedUserQR | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  // 1. Payload JSON PIMOBIPAY
  try {
    const parsed = JSON.parse(value) as Partial<PimpayUserQR>
    if (parsed && parsed.type === "user") {
      const id = clean(parsed.id)
      const identity: ParsedUserQR = {
        id,
        name: clean(parsed.name),
        firstName: clean(parsed.firstName),
        lastName: clean(parsed.lastName),
        username: clean(parsed.username),
        phone: clean(parsed.phone),
        email: clean(parsed.email),
        role: clean(parsed.role),
        agentId: clean(parsed.agentId),
      }
      identity.searchTerm =
        identity.username || identity.phone || identity.email || id
      if (identity.id || identity.searchTerm) return identity
    }
  } catch {
    // pas du JSON : on continue vers les fallbacks
  }

  // 2. Lien de parrainage / profil PIMOBIPAY
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const ref =
        clean(url.searchParams.get("ref")) ||
        clean(url.searchParams.get("code")) ||
        clean(url.searchParams.get("u")) ||
        clean(url.searchParams.get("id"))
      if (ref) return { username: ref, searchTerm: ref }

      const last = clean(url.pathname.split("/").filter(Boolean).pop())
      if (last) return { username: last, searchTerm: last }
    } catch {
      // URL invalide : on continue
    }
  }

  // 3. Prefixe applicatif : pimpay:<id>
  const prefixed = value.match(/^pimpay[:/]+(.+)$/i)
  if (prefixed?.[1]) {
    const id = prefixed[1].trim()
    return { id, searchTerm: id }
  }

  // 4. Identifiant brut : cuid, username, telephone ou e-mail
  if (/^[+@a-z0-9._-]{4,}$/i.test(value)) {
    const stripped = value.replace(/^@/, "")
    return { searchTerm: stripped }
  }

  return null
}

/** Nom complet lisible a partir d'une identite scannee ou d'un client API. */
export function displayFullName(
  person: {
    name?: string | null
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  } | null,
  fallback = "Client"
): string {
  if (!person) return fallback
  return (
    clean(person.name) ||
    [clean(person.firstName), clean(person.lastName)].filter(Boolean).join(" ") ||
    clean(person.username) ||
    fallback
  )
}
