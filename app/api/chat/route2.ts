import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const isAdmin = user.role === "ADMIN" || user.role === "AGENT";

    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: { id: ticketId, ...(isAdmin ? {} : { userId: user.id }) },
        include: { 
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } } 
        },
      });
      return NextResponse.json({ ticket });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { ...(isAdmin ? {} : { userId: user.id }) },
      orderBy: { createdAt: "desc" },
      include: { 
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 } 
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    const body = await req.json();
    const { ticketId, message, subject } = body;

    if (!message?.trim()) return NextResponse.json({ error: "Required" }, { status: 400 });

    const sanitizedMessage = message.trim();
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    // 1. GESTION DU TICKET
    let ticket;
    if (!ticketId) {
      ticket = await prisma.supportTicket.create({
        data: {
          userId: user?.id || "GUEST_USER",
          subject: subject || sanitizedMessage.slice(0, 50),
          messages: {
            create: {
              // Si l'admin crée le ticket, le sender est SUPPORT
              senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
              content: sanitizedMessage,
            },
          },
        },
      });
    } else {
      ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    }

    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. ENVOI DU MESSAGE (Si ticket existant)
    if (ticketId) {
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          // ICI : On force l'ID "SUPPORT" pour tes messages d'admin
          senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
          content: sanitizedMessage,
        },
      });
    }

    // 3. RÉPONSE ELARA (Seulement si le client écrit, pas l'admin)
    if (!isAdmin) {
      const allMsgs = await prisma.message.findMany({ 
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" } 
      });
      
      const userMsgs = allMsgs.filter(m => m.senderId !== "ELARA_AI" && m.senderId !== "SUPPORT");
      let elaraReply = "";

      if (userMsgs.length === 1) {
        elaraReply = "Bonjour ! Je suis Elara. Pour mieux vous aider, quel est votre **Nom complet** ?";
      } else if (userMsgs.length === 2) {
        elaraReply = "Merci ! Quelle est votre **adresse email** pour le suivi de ce ticket ?";
      } else if (userMsgs.length === 3) {
        elaraReply = "C'est noté. Je transmets votre dossier au support PimPay. Comment puis-je vous aider en attendant ?";
      } else {
        elaraReply = getAutoReply(sanitizedMessage);
      }

      await prisma.message.create({
        data: { ticketId: ticket.id, senderId: "ELARA_AI", content: elaraReply },
      });
    }

    const updated = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

function getAutoReply(msg: string): string {
  const low = msg.toLowerCase();
  if (low.includes("depot") || low.includes("deposit")) return "Dépôts : Menu Portefeuille > Déposer. Traitement < 5min.";
  if (low.includes("retrait") || low.includes("withdraw")) return "Retraits : Traités sous 15min. Minimum 1.0.";
  if (low.includes("kyc")) return "KYC : Envoyez CNI + Selfie dans votre Profil. Validation sous 24h.";
  return "Je n'ai pas la réponse exacte. Un agent humain (SUPPORT) va vous répondre ici très bientôt.";
}
