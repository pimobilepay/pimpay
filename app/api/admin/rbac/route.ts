export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_PRESETS,
  type PermissionKey,
} from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";

// GET — liste des admins + leur profil RBAC + catalogue de permissions
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.RBAC_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
      adminProfile: {
        select: {
          isSuperAdmin: true,
          permissions: true,
          title: true,
          active: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formatted = admins.map((a) => ({
    id: a.id,
    name: a.name,
    username: a.username,
    email: a.email,
    avatar: a.avatar,
    lastLoginAt: a.lastLoginAt,
    createdAt: a.createdAt,
    // Pas de profil => super-admin historique (accès total)
    isSuperAdmin: a.adminProfile ? a.adminProfile.isSuperAdmin : true,
    permissions: a.adminProfile
      ? a.adminProfile.isSuperAdmin
        ? ALL_PERMISSIONS
        : a.adminProfile.permissions
      : ALL_PERMISSIONS,
    title: a.adminProfile?.title || null,
    active: a.adminProfile ? a.adminProfile.active : true,
    hasProfile: !!a.adminProfile,
  }));

  return NextResponse.json({
    admins: formatted,
    catalog: ALL_PERMISSIONS.map((p) => ({ key: p, label: PERMISSION_LABELS[p] })),
    presets: Object.entries(ROLE_PRESETS).map(([key, v]) => ({
      key,
      label: v.label,
      permissions: v.permissions,
    })),
  });
}

// POST — mise à jour d'un profil RBAC
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.RBAC_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const { action, userId } = body as { action: string; userId: string };

  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });
  }

  // Empêche un admin de se retirer ses propres droits RBAC (lockout)
  if (userId === ctx.payload.id && (action === "setActive" || action === "setSuperAdmin")) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre statut super-admin / actif" },
      { status: 400 }
    );
  }

  let data: Record<string, any> = {};
  let logDetail = "";

  switch (action) {
    case "updatePermissions": {
      const perms = (body.permissions as PermissionKey[]).filter((p) =>
        ALL_PERMISSIONS.includes(p)
      );
      data = { permissions: perms, isSuperAdmin: false };
      logDetail = `Permissions mises à jour (${perms.length})`;
      break;
    }
    case "applyPreset": {
      const preset = ROLE_PRESETS[body.preset as string];
      if (!preset) return NextResponse.json({ error: "Preset inconnu" }, { status: 400 });
      data = {
        permissions: preset.permissions,
        isSuperAdmin: body.preset === "SUPER_ADMIN",
      };
      logDetail = `Preset "${preset.label}" appliqué`;
      break;
    }
    case "setSuperAdmin": {
      data = { isSuperAdmin: !!body.isSuperAdmin };
      logDetail = `Super-admin = ${!!body.isSuperAdmin}`;
      break;
    }
    case "setActive": {
      data = { active: !!body.active };
      logDetail = `Profil actif = ${!!body.active}`;
      break;
    }
    case "setTitle": {
      data = { title: String(body.title || "").slice(0, 80) };
      logDetail = `Titre = ${data.title}`;
      break;
    }
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const profile = await prisma.adminProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  await logAdminAction(req, ctx.payload, {
    action: `RBAC_${action.toUpperCase()}`,
    category: "rbac",
    targetId: userId,
    targetType: "admin",
    targetEmail: target.email,
    details: logDetail,
  });

  return NextResponse.json({ success: true, profile });
}
