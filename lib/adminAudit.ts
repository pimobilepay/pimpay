import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TokenPayload } from "@/lib/adminAuth";

/**
 * Journalisation des actions admin dans AuditLog (champs enrichis RBAC).
 * Ne lève jamais : l'échec d'écriture du journal ne doit pas casser l'action.
 */
export async function logAdminAction(
  req: NextRequest | null,
  admin: TokenPayload | { id: string; name?: string; email?: string } | null,
  params: {
    action: string;
    category?: string; // users | finance | security | aml | rbac | disputes | exchange | referral...
    targetId?: string | null;
    targetType?: string | null;
    targetEmail?: string | null;
    details?: string | null;
    status?: "SUCCESS" | "DENIED" | "FAILED";
  }
): Promise<void> {
  try {
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers.get("x-real-ip") ||
      null;
    const userAgent = req?.headers.get("user-agent") || null;

    await prisma.auditLog.create({
      data: {
        adminId: admin?.id || null,
        adminName: admin?.name || (admin as any)?.email || "SYSTEM",
        action: params.action,
        category: params.category || null,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        targetEmail: params.targetEmail || null,
        details: params.details || null,
        ip,
        userAgent,
        status: params.status || "SUCCESS",
      },
    });
  } catch (err) {
    console.error("[ADMIN_AUDIT_ERROR]:", err);
  }
}
