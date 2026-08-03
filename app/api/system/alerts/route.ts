export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveAlertsForUser, durationMinutes, formatDuration } from "@/lib/broadcast";

const CONFIG_ID = "GLOBAL_CONFIG";

/**
 * GET /api/system/alerts
 *
 * Alertes visibles par l'utilisateur courant (bannière globale) + état de la
 * maintenance avec tous ses détails (titre, message, fenêtre, durée, services).
 * Accessible sans session : un visiteur non connecté voit les alertes globales.
 */
export async function GET() {
  try {
    const payload = await getAuthPayload();

    let role = payload?.role ?? null;
    if (payload?.id && !role) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { role: true },
        });
        role = user?.role ?? null;
      } catch {
        /* ignore */
      }
    }

    const [alerts, config] = await Promise.all([
      getActiveAlertsForUser({ userId: payload?.id ?? null, role }),
      prisma.systemConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null),
    ]);

    const c = config as any;
    const startsAt = c?.maintenanceStartsAt ?? null;
    const endsAt = c?.maintenanceUntil ?? null;
    const durationMin = durationMinutes(startsAt, endsAt);
    const allowedRoles: string[] = c?.maintenanceAllowedRoles ?? ["ADMIN"];

    return NextResponse.json({
      alerts,
      maintenance: {
        active: Boolean(c?.maintenanceMode),
        title: c?.maintenanceTitle ?? null,
        message: c?.maintenanceMessage ?? null,
        severity: c?.maintenanceSeverity ?? "WARNING",
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        durationMin,
        durationLabel: formatDuration(durationMin),
        scopes: c?.maintenanceScopes ?? [],
        /** true si CE visiteur peut continuer d'utiliser la plateforme. */
        exempt: Boolean(role && allowedRoles.includes(role)),
      },
      announcement: c?.globalAnnouncement || null,
    });
  } catch (error) {
    console.error("[v0] SYSTEM_ALERTS_ERROR:", error);
    return NextResponse.json({ alerts: [], maintenance: { active: false }, announcement: null });
  }
}
