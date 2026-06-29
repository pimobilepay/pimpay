export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

// GET — journal d'audit admin dédié, filtrable par catégorie / statut / recherche
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.RBAC_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const take = Math.min(Number(searchParams.get("take") || 100), 300);

  const where: any = {};
  if (category && category !== "ALL") where.category = category;
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { adminName: { contains: q, mode: "insensitive" } },
      { targetEmail: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, totalCount, categories] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        adminId: true,
        adminName: true,
        action: true,
        category: true,
        targetId: true,
        targetType: true,
        targetEmail: true,
        details: true,
        ip: true,
        userAgent: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ["category"],
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    logs,
    totalCount,
    categories: categories
      .filter((c) => c.category)
      .map((c) => ({ category: c.category, count: c._count.id })),
  });
}
