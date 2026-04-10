import { NextRequest, NextResponse } from 'next/server';

// GET /api/settings - Retrieve business settings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || 'all';

  // Mock settings data
  const settings = {
    profile: {
      companyName: 'PimPay Technologies SARL',
      rccm: 'RC/DLA/2022/B/4521',
      niu: 'M042312456789A',
      address: 'Rue Joss, Bonanjo',
      city: 'Douala',
      country: 'Cameroun',
      phone: '+237 233 42 18 90',
      email: 'contact@pimpay.cm',
      timezone: 'Africa/Douala',
      language: 'fr',
      logoUrl: '/images/logo.png',
    },
    security: {
      twoFactorEnabled: true,
      twoFactorMethod: 'sms',
      recoveryPhone: '+237 6 91 ** ** 67',
      passwordLastChanged: '2024-03-15',
      activeSessions: [
        { id: 1, device: 'MacBook Pro — Chrome', ip: '197.159.2.45', location: 'Douala, CM', lastActive: new Date().toISOString(), current: true },
        { id: 2, device: 'iPhone 15 — Safari', ip: '197.159.2.48', location: 'Douala, CM', lastActive: new Date(Date.now() - 7200000).toISOString(), current: false },
        { id: 3, device: 'Windows PC — Firefox', ip: '41.202.219.73', location: 'Yaoundé, CM', lastActive: new Date(Date.now() - 86400000).toISOString(), current: false },
      ],
    },
    notifications: {
      channels: { email: true, push: true, sms: false },
      categories: { payments: true, invoices: true, employees: true, reports: false, security: true },
      frequency: 'immediate',
    },
    integrations: [
      { id: 'orange', name: 'Orange Money', connected: true, lastSync: new Date().toISOString() },
      { id: 'mtn', name: 'MTN MoMo', connected: true, lastSync: new Date().toISOString() },
      { id: 'bank', name: 'API Bancaire', connected: true, lastSync: new Date().toISOString() },
      { id: 'ohada', name: 'OHADA Comptabilité', connected: false, lastSync: null },
    ],
    billing: {
      plan: 'enterprise',
      planName: 'Plan Entreprise',
      pricePerMonth: 150000,
      currency: 'XAF',
      status: 'active',
      usage: { transactions: { used: 2847, limit: 10000 }, users: { used: 8, limit: 25 }, storage: { usedGb: 4.2, limitGb: 20 } },
      paymentMethod: { type: 'visa', last4: '4821', expiry: '08/2026' },
    },
  };

  if (section !== 'all' && section in settings) {
    return NextResponse.json({ data: settings[section as keyof typeof settings] });
  }
  return NextResponse.json({ data: settings });
}

// PUT /api/settings - Update business settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json({ error: 'Section and data are required' }, { status: 400 });
    }

    const validSections = ['profile', 'security', 'notifications', 'integrations', 'billing'];
    if (!validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid section: ' + section }, { status: 400 });
    }

    // In production, save to database
    return NextResponse.json({ success: true, message: 'Settings updated successfully', section, updatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/settings - Delete session or revoke integration
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (type === 'session') {
      return NextResponse.json({ success: true, message: 'Session ' + id + ' revoked' });
    }
    if (type === 'integration') {
      return NextResponse.json({ success: true, message: 'Integration ' + id + ' disconnected' });
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
