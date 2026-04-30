export const dynamic = "force-dynamic";
import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "PimPay <noreply@pimpay.app>";
const BATCH_SIZE = 50; // Resend batch limit

// POST: Send email campaign
export async function POST(req: NextRequest) {
  try {
    const admin = await adminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { subject, html, recipientType, role, emails } = await req.json();

    if (!subject || !html) {
      return NextResponse.json({ error: "Sujet et contenu requis" }, { status: 400 });
    }

    // Build recipient list
    let recipientEmails: string[] = [];

    if (recipientType === "individual") {
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return NextResponse.json({ error: "Aucun destinataire selectionne" }, { status: 400 });
      }
      recipientEmails = emails.filter(Boolean);
    } else {
      const where: Record<string, unknown> = {
        email: { not: null },
        status: { not: "BANNED" },
      };
      if (recipientType === "role" && role) {
        where.role = role;
      }

      const users = await prisma.user.findMany({
        where,
        select: { email: true },
      });
      recipientEmails = users.map((u) => u.email).filter(Boolean) as string[];
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire avec email valide" }, { status: 400 });
    }

    // Send in batches
    let sent = 0;
    let failed = 0;
    const total = recipientEmails.length;

    for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
      const batch = recipientEmails.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((to) =>
        resend.emails.send({ from: FROM_EMAIL, to, subject, html }).then(
          () => { sent++; },
          (err) => {
            console.error(`Email failed for ${to}:`, err);
            failed++;
          }
        )
      );
      await Promise.allSettled(batchPromises);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name || admin.email || "Admin",
        action: "EMAIL_CAMPAIGN_SENT",
        details: JSON.stringify({ subject, recipientType, role, total, sent, failed }),
      },
    });

    return NextResponse.json({ sent, failed, total });
  } catch (error: unknown) {
    const msg = error instanceof Error ? getErrorMessage(error) : "Erreur inconnue";
    console.error("SEND_EMAIL_ERROR:", error);
    return NextResponse.json({ error: "Echec envoi", details: msg }, { status: 500 });
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

    const where: Record<string, unknown> = {
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? getErrorMessage(error) : "Erreur inconnue";
    console.error("FETCH_USERS_ERROR:", error);
    return NextResponse.json({ error: "Echec", details: msg }, { status: 500 });
  }
}
