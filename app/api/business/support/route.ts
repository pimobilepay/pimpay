import { NextRequest, NextResponse } from 'next/server';

interface Message { id: number; author: string; role: 'client' | 'agent'; content: string; timestamp: string; }
interface Ticket {
  id: string; subject: string; category: string; priority: string;
  status: string; createdAt: string; lastReply: string; assignedTo: string;
  messages: Message[];
}

const tickets: Ticket[] = [
  { id: 'TKT-001', subject: 'Paiement Mobile Money bloqué depuis 48h', category: 'paiement', priority: 'urgent', status: 'ouvert', createdAt: '2024-04-10 09:15', lastReply: '2024-04-10 14:30', assignedTo: 'Marie Ngo',
    messages: [
      { id: 1, author: 'Jean-Pierre Mbarga', role: 'client', content: 'Un paiement de 15 200 000 XAF est bloqué.', timestamp: '2024-04-10 09:15' },
      { id: 2, author: 'Marie Ngo', role: 'agent', content: 'Nous avons identifié le problème et relancé la demande.', timestamp: '2024-04-10 10:30' },
    ]},
  { id: 'TKT-002', subject: 'Impossible de générer le rapport mensuel', category: 'technique', priority: 'haute', status: 'en_cours', createdAt: '2024-04-09 16:45', lastReply: '2024-04-10 11:00', assignedTo: 'Paul Essomba',
    messages: [{ id: 1, author: 'Sandrine Ateba', role: 'client', content: 'Erreur 500 lors de la génération du rapport Mars 2024.', timestamp: '2024-04-09 16:45' }]},
];

// GET /api/support - List support tickets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const ticketId = searchParams.get('id');

  if (ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json({ data: ticket });
  }

  let filtered = [...tickets];
  if (status) filtered = filtered.filter(t => t.status === status);
  if (priority) filtered = filtered.filter(t => t.priority === priority);
  if (category) filtered = filtered.filter(t => t.category === category);
  if (search) filtered = filtered.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()));

  const summary = {
    open: tickets.filter(t => t.status === 'ouvert').length,
    inProgress: tickets.filter(t => t.status === 'en_cours').length,
    resolved: tickets.filter(t => t.status === 'resolu').length,
    avgResponseTime: '2.4h',
  };

  return NextResponse.json({ data: filtered, summary });
}

// POST /api/support - Create new ticket or add reply
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reply') {
      const { ticketId, content, author } = body;
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      const message: Message = { id: ticket.messages.length + 1, author, role: 'client', content, timestamp: new Date().toISOString() };
      ticket.messages.push(message);
      ticket.lastReply = message.timestamp;
      return NextResponse.json({ success: true, data: message });
    }

    const { subject, category, priority, description } = body;
    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'subject, category, and description are required' }, { status: 400 });
    }

    const newTicket: Ticket = {
      id: 'TKT-' + String(tickets.length + 1).padStart(3, '0'),
      subject, category, priority: priority || 'moyenne', status: 'ouvert',
      createdAt: new Date().toISOString(), lastReply: new Date().toISOString(),
      assignedTo: 'Non assigné',
      messages: [{ id: 1, author: 'Utilisateur', role: 'client', content: description, timestamp: new Date().toISOString() }],
    };

    tickets.push(newTicket);
    return NextResponse.json({ success: true, data: newTicket }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/support - Update ticket status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, status, assignedTo } = body;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
