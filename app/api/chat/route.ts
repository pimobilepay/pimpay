import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const { ticketId, message } = await req.json();
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    if (!message?.trim()) return NextResponse.json({ error: "Message vide" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      let ticket;

      if (!ticketId) {
        // 1. Création du ticket (Guest ou User)
        ticket = await tx.supportTicket.create({
          data: {
            userId: user?.id || null,
            subject: message.slice(0, 50),
            messages: {
              create: {
                senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
                content: message
              }
            }
          }
        });

        // 2. Présentation Elara (seulement si c'est un nouveau ticket utilisateur/guest)
        if (!isAdmin) {
          await tx.message.create({
            data: {
              ticketId: ticket.id,
              senderId: "ELARA_AI",
              content: "Bonjour ! Je suis Elara, votre assistante PimPay. Pour mieux vous aider, pouvez-vous me donner votre **Nom complet** et votre **Email** ?"
            }
          });
        }
      } else {
        // Réponse sur un ticket existant
        const existingTicket = await tx.supportTicket.findFirst({
          where: isAdmin ? { id: ticketId } : { id: ticketId, userId: user?.id || null }
        });

        if (!existingTicket) throw new Error("Ticket introuvable");

        await tx.message.create({
          data: {
            ticketId: existingTicket.id,
            senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
            content: message
          }
        });
        ticket = existingTicket;
      }

      return await tx.supportTicket.findUnique({
        where: { id: ticket.id },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      });
    });

    return NextResponse.json({ ticket: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Garder le GET tel quel pour la lecture
export async function GET(req: NextRequest) {
    const user = await auth().catch(() => null);
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: isAdmin ? { id: ticketId } : { id: ticketId, userId: user?.id || null },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      });
      return NextResponse.json({ ticket });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : { userId: user?.id || null },
      orderBy: { createdAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } }
    });

    return NextResponse.json({ tickets });
}
