import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Fetch a single ticket with all messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { username: true, email: true, firstName: true, lastName: true } }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("PIMPAY_TICKET_FETCH_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur", message: error.message }, { status: 500 });
  }
}

// POST: Add a reply message to a ticket
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, senderId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    // FIX #1: Normalize senderId so chat/page.tsx renders admin replies correctly.
    // chat/page.tsx checks senderId === "SUPPORT" for the agent badge + left-aligned bubble.
    // Anything else (including "ADMIN") was treated as a user message (right-aligned, blue).
    const normalizedSenderId =
      !senderId || senderId === "ADMIN" || senderId === "SUPPORT"
        ? "SUPPORT"
        : senderId;

    const message = await prisma.message.create({
      data: {
        ticketId: id,
        senderId: normalizedSenderId,
        content: content.trim(),
      }
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "IN_PROGRESS" }
      });
    }

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error: any) {
    console.error("PIMPAY_REPLY_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur", message: error.message }, { status: 500 });
  }
}

// PATCH: Update ticket status (close, reopen, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error("PIMPAY_TICKET_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur", message: error.message }, { status: 500 });
  }
}
