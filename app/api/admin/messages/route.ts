export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const admin = await adminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Email functionality has been removed - Resend package uninstalled
    return NextResponse.json({ 
      error: "Fonctionnalite email desactivee. Le package Resend a ete desinstalle." 
    }, { status: 501 });

  } catch (error: any) {
    console.error("SEND_EMAIL_ERROR:", error);
    return NextResponse.json({ error: "Echec envoi", details: error.message }, { status: 500 });
  }
}

// GET: Fetch users for recipient selection
export async function GET(req: NextRequest) {
  try {
    const admin = await adminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("search") || "";
    const roleFilter = req.nextUrl.searchParams.get("role") || "";

    const where: any = {
      email: { not: null },
      status: { not: "BANNED" },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter;
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, username: true, role: true, avatar: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    // Count by role
    const [totalAll, totalUser, totalAgent, totalMerchant, totalAdmin] = await Promise.all([
      prisma.user.count({ where: { email: { not: null }, status: { not: "BANNED" } } }),
      prisma.user.count({ where: { email: { not: null }, status: { not: "BANNED" }, role: "USER" } }),
      prisma.user.count({ where: { email: { not: null }, status: { not: "BANNED" }, role: "AGENT" } }),
      prisma.user.count({ where: { email: { not: null }, status: { not: "BANNED" }, role: "MERCHANT" } }),
      prisma.user.count({ where: { email: { not: null }, status: { not: "BANNED" }, role: "ADMIN" } }),
    ]);

    return NextResponse.json({
      users,
      counts: { all: totalAll, USER: totalUser, AGENT: totalAgent, MERCHANT: totalMerchant, ADMIN: totalAdmin },
    });
  } catch (error: any) {
    console.error("FETCH_USERS_ERROR:", error);
    return NextResponse.json({ error: "Echec", details: error.message }, { status: 500 });
  }
}
