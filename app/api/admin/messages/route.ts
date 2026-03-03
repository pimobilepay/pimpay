export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { Resend } from "resend";

// Batch size for sending emails
const BATCH_SIZE = 10;

export async function POST(req: NextRequest) {
  try {
    const admin = await adminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY non configure" }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = await req.json();
    const { subject, html, recipientType, role, emails } = body as {
      subject: string;
      html: string;
      recipientType: "all" | "role" | "individual";
      role?: string;
      emails?: string[];
    };

    if (!subject || !html) {
      return NextResponse.json({ error: "Sujet et contenu HTML requis" }, { status: 400 });
    }

    // Determine recipients
    let recipientEmails: string[] = [];

    if (recipientType === "all") {
      const users = await prisma.user.findMany({
        where: { email: { not: null }, status: { not: "BANNED" } },
        select: { email: true },
      });
      recipientEmails = users.map((u) => u.email).filter(Boolean) as string[];
    } else if (recipientType === "role" && role) {
      const users = await prisma.user.findMany({
        where: { role: role as any, email: { not: null }, status: { not: "BANNED" } },
        select: { email: true },
      });
      recipientEmails = users.map((u) => u.email).filter(Boolean) as string[];
    } else if (recipientType === "individual" && emails?.length) {
      recipientEmails = emails.filter(Boolean);
    } else {
      return NextResponse.json({ error: "Type de destinataire invalide" }, { status: 400 });
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire trouve" }, { status: 400 });
    }

    // Send emails in batches
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
      const batch = recipientEmails.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((email) =>
          resend.emails.send({
            from: process.env.RESEND_FROM || "PimPay <onboarding@resend.dev>",
            to: email,
            subject,
            html,
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          failCount++;
          errors.push(result.reason?.message || "Erreur inconnue");
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name || admin.email || "Admin",
        action: "SEND_EMAIL_CAMPAIGN",
        details: `Email "${subject}" envoye a ${successCount}/${recipientEmails.length} destinataires (type: ${recipientType}${role ? `, role: ${role}` : ""})`,
        targetId: null,
      },
    });

    return NextResponse.json({
      success: true,
      total: recipientEmails.length,
      sent: successCount,
      failed: failCount,
      errors: errors.slice(0, 5),
    });
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
