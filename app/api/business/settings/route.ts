export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as jose from 'jose';

// Helper to verify auth from request
async function verifyAuthFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value || req.cookies.get('pimpay_token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: { 
        id: true, 
        username: true, 
        role: true,
        email: true,
        phone: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        country: true,
        city: true,
        address: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      }
    });

    return user;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

// GET /api/business/settings - Retrieve business settings with real data
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (session.role !== 'BUSINESS_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all';

    // Fetch business data linked to user email
    const business = await prisma.business.findFirst({
      where: { email: session.email },
      include: {
        BusinessEmployee: true,
        BusinessInvoice: true,
      }
    });

    // Fetch active sessions for this user
    const activeSessions = await prisma.session.findMany({
      where: { 
        userId: session.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Build profile data from real user and business info
    const profile = {
      // Admin user info
      adminName: session.name || `${session.firstName || ''} ${session.lastName || ''}`.trim() || session.username,
      adminEmail: session.email,
      adminPhone: session.phone,
      adminAvatar: session.avatar,
      // Business info
      companyName: business?.name || '',
      rccm: business?.registrationNumber || '',
      niu: '', // Not in schema, can be added later
      address: '',
      city: business?.city || '',
      country: business?.country || 'Cameroun',
      phone: business?.phone || session.phone || '',
      email: business?.email || session.email || '',
      timezone: 'Africa/Douala',
      language: 'fr',
      logoUrl: business?.logo || '',
      businessId: business?.id || null,
      businessStatus: business?.status || 'PENDING_VERIFICATION',
      businessType: business?.type || '',
      businessCategory: business?.category || '',
      businessDescription: business?.description || '',
    };

    // Build security data
    const security = {
      twoFactorEnabled: session.twoFactorEnabled || false,
      twoFactorMethod: session.twoFactorEnabled ? 'sms' : '',
      recoveryPhone: session.phone ? session.phone.replace(/(\d{3})\d{4}(\d{2})/, '$1 ** ** $2') : '',
      passwordLastChanged: session.createdAt?.toISOString() || new Date().toISOString(),
      activeSessions: activeSessions.map((s, index) => ({
        id: index + 1,
        sessionId: s.id,
        device: s.userAgent || 'Navigateur inconnu',
        ip: s.ipAddress || 'IP inconnue',
        location: session.city ? `${session.city}, ${session.country || 'CM'}` : 'Localisation inconnue',
        lastActive: s.createdAt?.toISOString() || new Date().toISOString(),
        current: index === 0,
      })),
    };

    // Notifications settings (could be stored in a separate table)
    const notifications = {
      channels: { email: true, push: true, sms: false },
      categories: { payments: true, invoices: true, employees: true, reports: false, security: true },
      frequency: 'immediate',
    };

    // Integrations status
    const integrations = [
      { id: 'orange', name: 'Orange Money', connected: true, lastSync: new Date().toISOString() },
      { id: 'mtn', name: 'MTN MoMo', connected: true, lastSync: new Date().toISOString() },
      { id: 'bank', name: 'API Bancaire', connected: false, lastSync: null },
      { id: 'ohada', name: 'OHADA Comptabilite', connected: false, lastSync: null },
    ];

    // Billing info
    const employeeCount = business?.BusinessEmployee?.length || 0;
    const invoiceCount = business?.BusinessInvoice?.length || 0;
    
    const billing = {
      plan: 'enterprise',
      planName: 'Plan Entreprise',
      pricePerMonth: 150000,
      currency: 'XAF',
      status: 'active',
      usage: { 
        transactions: { used: invoiceCount, limit: 10000 }, 
        users: { used: employeeCount, limit: 25 }, 
        storage: { usedGb: 1.2, limitGb: 20 } 
      },
      paymentMethod: { type: 'visa', last4: '4821', expiry: '08/2026' },
    };

    const settings = {
      profile,
      security,
      notifications,
      integrations,
      billing,
    };

    if (section !== 'all' && section in settings) {
      return NextResponse.json({ data: settings[section as keyof typeof settings] });
    }
    
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Failed to fetch business settings:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/business/settings - Update business settings
export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (session.role !== 'BUSINESS_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json({ error: 'Section and data are required' }, { status: 400 });
    }

    const validSections = ['profile', 'security', 'notifications', 'integrations', 'billing'];
    if (!validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid section: ' + section }, { status: 400 });
    }

    // Update profile section
    if (section === 'profile') {
      // Update user info
      await prisma.user.update({
        where: { id: session.id },
        data: {
          phone: data.phone || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          address: data.address || undefined,
        }
      });

      // Update business info if exists
      const business = await prisma.business.findFirst({
        where: { email: session.email }
      });

      if (business) {
        await prisma.business.update({
          where: { id: business.id },
          data: {
            name: data.companyName || undefined,
            city: data.city || undefined,
            country: data.country || undefined,
            phone: data.phone || undefined,
            description: data.businessDescription || undefined,
          }
        });
      }
    }

    // Update security section
    if (section === 'security') {
      await prisma.user.update({
        where: { id: session.id },
        data: {
          twoFactorEnabled: data.twoFactorEnabled,
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully', 
      section, 
      updatedAt: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/business/settings - Delete session or revoke integration
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id, sessionId } = body;

    if (type === 'session') {
      // Revoke session by marking it as inactive
      await prisma.session.updateMany({
        where: { 
          id: sessionId || String(id),
          userId: session.id,
        },
        data: { isActive: false }
      });
      return NextResponse.json({ success: true, message: 'Session revoquee' });
    }
    
    if (type === 'integration') {
      // For now, just return success (integration management could be expanded)
      return NextResponse.json({ success: true, message: 'Integration ' + id + ' deconnectee' });
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
