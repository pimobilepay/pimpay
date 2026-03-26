export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// GET - Get business settings and profile
export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Get business details
    const business = await prisma.business.findFirst({
      where: { email: user.email }
    });

    // Get active sessions
    const sessions = await prisma.session.findMany({
      where: { userId: session.id, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
      take: 5
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          address: user.address,
          city: user.city,
          country: user.country,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        business: business ? {
          id: business.id,
          name: business.name,
          registrationNumber: business.registrationNumber,
          type: business.type,
          category: business.category,
          status: business.status,
          description: business.description,
          city: business.city,
          country: business.country,
          email: business.email,
          phone: business.phone,
          logo: business.logo,
        } : null,
        sessions: sessions.map(s => ({
          id: s.id,
          device: s.deviceName || s.userAgent || "Appareil inconnu",
          browser: s.browser,
          os: s.os,
          location: s.city && s.country ? `${s.city}, ${s.country}` : "Localisation inconnue",
          lastActive: s.lastActiveAt,
          isCurrent: s.token === session.token,
        }))
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_SETTINGS_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update business settings
export async function PUT(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      // User fields
      name, phone, address, city, country, avatar,
      // Business fields
      businessName, businessDescription, businessCategory,
      // Security fields
      currentPassword, newPassword, twoFactorEnabled
    } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.id }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Handle password change
    if (currentPassword && newPassword) {
      if (!user.password) {
        return NextResponse.json({ error: "Aucun mot de passe configure" }, { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.id },
        data: { password: hashedPassword }
      });

      // Log security event
      await prisma.securityLog.create({
        data: {
          userId: session.id,
          action: "PASSWORD_CHANGED",
          ip: req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1",
          device: req.headers.get("user-agent") || "Unknown",
        }
      });

      return NextResponse.json({ success: true, message: "Mot de passe mis a jour" });
    }

    // Update user profile
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.id },
        data: updateData
      });
    }

    // Update business if applicable
    if (businessName || businessDescription || businessCategory) {
      const business = await prisma.business.findFirst({
        where: { email: user.email }
      });

      if (business) {
        const businessUpdate: any = {};
        if (businessName) businessUpdate.name = businessName;
        if (businessDescription) businessUpdate.description = businessDescription;
        if (businessCategory) businessUpdate.category = businessCategory;

        await prisma.business.update({
          where: { id: business.id },
          data: businessUpdate
        });
      }
    }

    return NextResponse.json({ success: true, message: "Parametres mis a jour" });

  } catch (error: any) {
    console.error("BUSINESS_SETTINGS_PUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Revoke a session
export async function DELETE(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('revokeAll') === 'true';

    if (revokeAll) {
      // Revoke all sessions except current
      await prisma.session.updateMany({
        where: { 
          userId: session.id,
          token: { not: session.token }
        },
        data: { isActive: false }
      });

      return NextResponse.json({ success: true, message: "Toutes les autres sessions ont ete revoquees" });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "ID de session requis" }, { status: 400 });
    }

    // Verify session belongs to user
    const targetSession = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.id }
    });

    if (!targetSession) {
      return NextResponse.json({ error: "Session non trouvee" }, { status: 404 });
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: "Session revoquee" });

  } catch (error: any) {
    console.error("BUSINESS_SETTINGS_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
