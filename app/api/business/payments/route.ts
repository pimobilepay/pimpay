import { NextRequest, NextResponse } from 'next/server';

interface Payment {
  id: string; beneficiary: string; email: string; amount: number;
  method: string; date: string; status: string; direction: string;
  description: string; reference: string;
}

// Mock payments data store
const payments: Payment[] = [
  { id: 'PAY-2024-001', beneficiary: 'BGFI Holdings', email: 'finance@bgfi.com', amount: 45600000, method: 'virement', date: '2024-04-10', status: 'completed', direction: 'sent', description: 'Paiement consultation Q1', reference: 'REF-BGF-001' },
  { id: 'PAY-2024-002', beneficiary: 'Afriland First Group', email: 'ap@afriland.com', amount: 28350000, method: 'virement', date: '2024-04-09', status: 'completed', direction: 'received', description: 'Règlement facture INV-2024-002', reference: 'REF-AFL-002' },
  { id: 'PAY-2024-003', beneficiary: 'Ecobank Transnational', email: 'procurement@ecobank.com', amount: 67800000, method: 'virement', date: '2024-04-08', status: 'completed', direction: 'sent', description: 'Migration plateforme', reference: 'REF-ECO-003' },
  { id: 'PAY-2024-004', beneficiary: 'UBA Cameroun', email: 'finance@uba.cm', amount: 15200000, method: 'mobile_money', date: '2024-04-07', status: 'pending', direction: 'sent', description: 'Services mensuels', reference: 'REF-UBA-004' },
];

// GET /api/payments - List payments with filtering
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const direction = searchParams.get('direction');
  const method = searchParams.get('method');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  let filtered = [...payments];
  if (status) filtered = filtered.filter(p => p.status === status);
  if (direction) filtered = filtered.filter(p => p.direction === direction);
  if (method) filtered = filtered.filter(p => p.method === method);
  if (search) filtered = filtered.filter(p => p.beneficiary.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const summary = {
    totalSent: payments.filter(p => p.direction === 'sent' && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    totalReceived: payments.filter(p => p.direction === 'received' && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    totalPending: payments.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0),
    totalFailed: payments.filter(p => p.status === 'failed').reduce((s, p) => s + p.amount, 0),
  };

  return NextResponse.json({ data: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary });
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beneficiary, amount, method, description, reference } = body;

    if (!beneficiary || !amount || !method) {
      return NextResponse.json({ error: 'beneficiary, amount, and method are required' }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const newPayment: Payment = {
      id: 'PAY-2024-' + String(payments.length + 1).padStart(3, '0'),
      beneficiary, email: '', amount, method, date: new Date().toISOString().split('T')[0],
      status: 'processing', direction: 'sent', description: description || '',
      reference: reference || 'REF-' + Date.now(),
    };

    payments.push(newPayment);
    return NextResponse.json({ success: true, data: newPayment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
