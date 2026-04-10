import { NextRequest, NextResponse } from 'next/server';

type EventType = 'payment_sent' | 'payment_received' | 'invoice_created' | 'user_login' | 'settings_changed' | 'employee_added' | 'report_generated';

interface HistoryEntry {
  id: number; type: EventType; description: string; user: string;
  amount: number | null; date: string; time: string; ip: string;
}

const history: HistoryEntry[] = [
  { id: 1, type: 'payment_sent', description: 'Paiement de 45 600 000 XAF envoyé à BGFI Holdings', user: 'Jean-Pierre Mbarga', amount: 45600000, date: '2024-04-10', time: '14:23', ip: '197.159.2.45' },
  { id: 2, type: 'user_login', description: 'Connexion depuis Chrome / macOS', user: 'Marie-Claire Ngo', amount: null, date: '2024-04-10', time: '13:45', ip: '197.159.2.48' },
  { id: 3, type: 'invoice_created', description: 'Facture INV-2024-012 créée pour Orange Cameroun', user: 'Sandrine Ateba', amount: 8750000, date: '2024-04-10', time: '11:30', ip: '197.159.2.45' },
  { id: 4, type: 'payment_received', description: 'Paiement de 28 350 000 XAF reçu de Afriland First Group', user: 'Système', amount: 28350000, date: '2024-04-10', time: '10:15', ip: '-' },
  { id: 5, type: 'report_generated', description: 'Rapport mensuel Mars 2024 généré', user: 'Sandrine Ateba', amount: null, date: '2024-04-10', time: '09:00', ip: '197.159.2.45' },
  { id: 6, type: 'settings_changed', description: 'Activation de l\'authentification 2FA', user: 'Jean-Pierre Mbarga', amount: null, date: '2024-04-09', time: '17:30', ip: '197.159.2.45' },
  { id: 7, type: 'employee_added', description: 'Nouvel employé: Robert Manga (IT)', user: 'Jean-Pierre Mbarga', amount: null, date: '2024-04-09', time: '15:20', ip: '197.159.2.45' },
  { id: 8, type: 'payment_sent', description: 'Paiement de 15 200 000 XAF initié vers UBA Cameroun', user: 'Sandrine Ateba', amount: 15200000, date: '2024-04-09', time: '14:00', ip: '197.159.2.45' },
];

// GET /api/history - List history entries with filtering & pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const user = searchParams.get('user');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  let filtered = [...history];
  if (type) {
    const typeMap: Record<string, EventType[]> = {
      transactions: ['payment_sent', 'payment_received'],
      activities: ['invoice_created', 'employee_added', 'report_generated'],
      logins: ['user_login'],
      changes: ['settings_changed'],
    };
    if (typeMap[type]) filtered = filtered.filter(h => typeMap[type].includes(h.type));
    else filtered = filtered.filter(h => h.type === type);
  }
  if (search) filtered = filtered.filter(h => h.description.toLowerCase().includes(search.toLowerCase()) || h.user.toLowerCase().includes(search.toLowerCase()));
  if (dateFrom) filtered = filtered.filter(h => h.date >= dateFrom);
  if (dateTo) filtered = filtered.filter(h => h.date <= dateTo);
  if (user) filtered = filtered.filter(h => h.user.toLowerCase().includes(user.toLowerCase()));

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * limit, page * limit);
  const totalVolume = history.filter(h => h.amount).reduce((s, h) => s + (h.amount || 0), 0);

  const summary = {
    totalEntries: history.length,
    totalVolume,
    thisMonth: history.filter(h => h.date.startsWith('2024-04')).length,
    growth: '+12.5%',
  };

  // Group by date for timeline view
  const grouped: Record<string, HistoryEntry[]> = {};
  paged.forEach(h => { (grouped[h.date] ??= []).push(h); });

  return NextResponse.json({
    data: paged, grouped, summary,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/history - Log a new history entry (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, description, user, amount, ip } = body;

    if (!type || !description || !user) {
      return NextResponse.json({ error: 'type, description, and user are required' }, { status: 400 });
    }

    const now = new Date();
    const entry: HistoryEntry = {
      id: history.length + 1, type, description, user, amount: amount || null,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      ip: ip || 'unknown',
    };

    history.push(entry);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/history - Export history (triggers download)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';

  // In production, generate actual file
  return NextResponse.json({
    success: true,
    message: 'Export started',
    format,
    downloadUrl: '/api/history/export?format=' + format + '&token=temp_' + Date.now(),
  });
}
