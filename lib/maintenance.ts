import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Verrou de maintenance — source de vérité UNIQUE et côté serveur.
 *
 * Avant ce module, activer la maintenance depuis l'admin ne faisait que :
 *   1. écrire `maintenanceMode` dans SystemConfig (erreur silencieusement ignorée),
 *   2. poser un cookie `maintenance_mode` … sur le navigateur de l'ADMIN.
 * Aucun autre visiteur ne recevait ce cookie et le proxy ne le lisait jamais :
 * les utilisateurs déjà connectés restaient en ligne et de nouveaux pouvaient
 * continuer à se connecter. Ce module centralise le blocage réel.
 */

export const CONFIG_ID = "GLOBAL_CONFIG";

export interface MaintenanceState {
  maintenanceMode: boolean;
  title: string | null;
  message: string | null;
  severity: string;
  startsAt: string | null;
  endsAt: string | null;
  scopes: string[];
  allowedRoles: string[];
}

const EMPTY_STATE: MaintenanceState = {
  maintenanceMode: false,
  title: null,
  message: null,
  severity: "WARNING",
  startsAt: null,
  endsAt: null,
  scopes: [],
  allowedRoles: ["ADMIN"],
};

// Cache mémoire très court : la maintenance est consultée sur chaque requête
// authentifiée, on évite un aller-retour base de données systématique tout en
// gardant une propagation quasi immédiate (5 s) après activation.
const CACHE_TTL_MS = 5_000;
let cache: { state: MaintenanceState; expiresAt: number } | null = null;

export function invalidateMaintenanceCache() {
  cache = null;
}

export async function getMaintenanceState(): Promise<MaintenanceState> {
  if (cache && cache.expiresAt > Date.now()) return cache.state;

  try {
    const config: any = await prisma.systemConfig.findUnique({
      where: { id: CONFIG_ID },
    });

    const endsAt: Date | null = config?.maintenanceUntil
      ? new Date(config.maintenanceUntil)
      : null;

    // Fenêtre expirée => maintenance considérée terminée (sécurité anti-oubli).
    const expired = Boolean(endsAt && endsAt.getTime() <= Date.now());

    const state: MaintenanceState = {
      maintenanceMode: Boolean(config?.maintenanceMode) && !expired,
      title: config?.maintenanceTitle ?? null,
      message: config?.maintenanceMessage ?? null,
      severity: config?.maintenanceSeverity ?? "WARNING",
      startsAt: config?.maintenanceStartsAt
        ? new Date(config.maintenanceStartsAt).toISOString()
        : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      scopes: Array.isArray(config?.maintenanceScopes) ? config.maintenanceScopes : [],
      allowedRoles:
        Array.isArray(config?.maintenanceAllowedRoles) && config.maintenanceAllowedRoles.length
          ? config.maintenanceAllowedRoles
          : ["ADMIN"],
    };

    cache = { state, expiresAt: Date.now() + CACHE_TTL_MS };
    return state;
  } catch (error) {
    console.error("[v0] MAINTENANCE_STATE_ERROR:", (error as Error)?.message);
    // En cas d'erreur base, on ne bloque JAMAIS la plateforme par défaut.
    return EMPTY_STATE;
  }
}

/**
 * Un rôle est-il autorisé à utiliser la plateforme pendant la maintenance ?
 * L'ADMIN est toujours autorisé (sinon plus personne ne peut la désactiver).
 */
export function isRoleAllowedDuringMaintenance(
  state: MaintenanceState,
  role?: string | null
): boolean {
  if (!state.maintenanceMode) return true;
  const normalized = (role || "USER").toUpperCase();
  if (normalized === "ADMIN") return true;
  return state.allowedRoles.map((r) => String(r).toUpperCase()).includes(normalized);
}

/**
 * Garde à utiliser dans les routes d'authentification et les APIs sensibles.
 * Renvoie une réponse 503 prête à l'emploi si l'accès doit être refusé, sinon `null`.
 */
export async function blockIfMaintenance(
  role?: string | null
): Promise<NextResponse | null> {
  const state = await getMaintenanceState();
  if (isRoleAllowedDuringMaintenance(state, role)) return null;

  return NextResponse.json(
    {
      error:
        state.message ||
        "La plateforme est momentanément indisponible pour maintenance technique.",
      accountStatus: "PLATFORM_MAINTENANCE",
      maintenanceMode: true,
      title: state.title || "Maintenance en cours",
      message:
        state.message ||
        "La plateforme est momentanément indisponible pour maintenance technique.",
      endsAt: state.endsAt,
      scopes: state.scopes,
    },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Révoque les sessions actives de tous les rôles non autorisés.
 * Appelé à l'activation de la maintenance : les utilisateurs déjà connectés
 * ne peuvent plus renouveler leur access token (15 min) et sont déconnectés.
 */
export async function revokeSessionsForMaintenance(
  allowedRoles: string[]
): Promise<number> {
  const allowed = Array.from(
    new Set([...allowedRoles.map((r) => String(r).toUpperCase()), "ADMIN"])
  );

  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        user: { role: { notIn: allowed as any } },
      },
      data: { isActive: false },
    });
    return result.count;
  } catch (error) {
    console.error("[v0] MAINTENANCE_REVOKE_SESSIONS_ERROR:", (error as Error)?.message);
    return 0;
  }
}
