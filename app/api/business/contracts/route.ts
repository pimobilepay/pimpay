import { NextRequest, NextResponse } from 'next/server';

interface Milestone { id: number; title: string; date: string; done: boolean; }
interface Contract {
  id: string; title: string; partner: string; type: string;
  startDate: string; endDate: string; value: number; status: string;
  description: string; terms: string; milestones: Milestone[];
}

const contracts: Contract[] = [
  { id: 'CTR-2024-001', title: 'Conseil stratégique et transformation digitale', partner: 'BGFI Holdings', type: 'service', startDate: '2024-01-01', endDate: '2024-12-31', value: 182400000, status: 'actif', description: 'Mission de conseil stratégique pour la transformation digitale.', terms: 'Paiement trimestriel. Livrables mensuels.',
    milestones: [{ id: 1, title: 'Audit initial', date: '2024-02-15', done: true },{ id: 2, title: 'Plan de transformation', date: '2024-04-30', done: true }] },
  { id: 'CTR-2024-002', title: 'Intégration API bancaire', partner: 'Afriland First Bank', type: 'service', startDate: '2024-02-01', endDate: '2024-08-31', value: 113400000, status: 'actif', description: 'Développement et intégration des APIs bancaires.', terms: 'Paiement sur livrable. SLA 99.9%.',
    milestones: [{ id: 1, title: 'Spécifications', date: '2024-02-28', done: true }] },
  { id: 'CTR-2024-003', title: 'Migration plateforme de paiement', partner: 'Ecobank Transnational', type: 'partenariat', startDate: '2024-03-01', endDate: '2025-02-28', value: 271200000, status: 'actif', description: 'Partenariat pour migration plateforme régionale.', terms: 'Exclusif Afrique Centrale. Partage revenus 60/40.',
    milestones: [{ id: 1, title: 'Architecture', date: '2024-04-30', done: true }] },
];

// GET /api/contracts - List contracts with filtering
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const contractId = searchParams.get('id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (contractId) {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    return NextResponse.json({ data: contract });
  }

  let filtered = [...contracts];
  if (status) filtered = filtered.filter(c => c.status === status);
  if (type) filtered = filtered.filter(c => c.type === type);
  if (search) filtered = filtered.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.partner.toLowerCase().includes(search.toLowerCase()));

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const summary = {
    active: contracts.filter(c => c.status === 'actif').length,
    pending: contracts.filter(c => c.status === 'en_attente').length,
    expiringSoon: contracts.filter(c => c.status === 'actif' && c.endDate <= '2024-05-10').length,
    totalValue: contracts.filter(c => c.status === 'actif').reduce((s, c) => s + c.value, 0),
  };

  const typeDistribution = [
    { name: 'Service', count: contracts.filter(c => c.type === 'service').length },
    { name: 'Fourniture', count: contracts.filter(c => c.type === 'fourniture').length },
    { name: 'Emploi', count: contracts.filter(c => c.type === 'emploi').length },
    { name: 'Partenariat', count: contracts.filter(c => c.type === 'partenariat').length },
  ];

  return NextResponse.json({
    data: paged, summary, typeDistribution,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/contracts - Create new contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, partner, type, startDate, endDate, value, description, terms, saveAsDraft } = body;

    if (!title || !partner || !type) {
      return NextResponse.json({ error: 'title, partner, and type are required' }, { status: 400 });
    }

    const newContract: Contract = {
      id: 'CTR-2024-' + String(contracts.length + 1).padStart(3, '0'),
      title, partner, type, startDate: startDate || '', endDate: endDate || '',
      value: value || 0, status: saveAsDraft ? 'brouillon' : 'en_attente',
      description: description || '', terms: terms || '', milestones: [],
    };

    contracts.push(newContract);
    return NextResponse.json({ success: true, data: newContract }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT /api/contracts - Update contract
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const contract = contracts.find(c => c.id === id);
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    Object.assign(contract, updates);
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/contracts - Update milestone status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, milestoneId, done } = body;
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    const milestone = contract.milestones.find(m => m.id === milestoneId);
    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    milestone.done = done;
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
