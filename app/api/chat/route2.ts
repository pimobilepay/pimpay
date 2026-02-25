import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch user's chat conversations (tickets) and messages
export async function GET(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    // If ticketId is provided, fetch messages for that ticket
    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: { id: ticketId, userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      return NextResponse.json({ ticket });
    }

    // Otherwise, fetch all tickets for the user
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new ticket or send a message in an existing ticket
export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, message, subject } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const sanitizedMessage = message.trim().slice(0, 2000);

    // If no ticketId, create a new ticket with the first message
    if (!ticketId) {
      const ticketSubject = subject || sanitizedMessage.slice(0, 50);

      const ticket = await prisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: ticketSubject,
          status: "OPEN",
          priority: "MEDIUM",
          messages: {
            create: {
              senderId: user.id,
              content: sanitizedMessage,
            },
          },
        },
        include: {
          messages: true,
        },
      });

      // Create an auto-reply from the system
      const autoReply = await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: "ELARA_AI",
          content: getAutoReply(sanitizedMessage),
        },
      });

      const fullTicket = await prisma.supportTicket.findUnique({
        where: { id: ticket.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return NextResponse.json({ ticket: fullTicket }, { status: 201 });
    }

    // Verify ticket belongs to user
    const existingTicket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: user.id },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Add message to existing ticket
    await prisma.message.create({
      data: {
        ticketId,
        senderId: user.id,
        content: sanitizedMessage,
      },
    });

    // Update ticket status if it was closed
    if (existingTicket.status === "CLOSED") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "OPEN" },
      });
    }

    // Auto-reply
    await prisma.message.create({
      data: {
        ticketId,
        senderId: "ELARA_AI",
        content: getAutoReply(sanitizedMessage),
      },
    });

    const updatedTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Temporary auto-reply logic (will be replaced by AI later)
function getAutoReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("deposit") || lower.includes("depot") || lower.includes("depôt")) {
    return "Pour effectuer un depot, rendez-vous dans la section Depot de votre tableau de bord. Les depots sont generalement traites en moins de 5 minutes. Si vous rencontrez un probleme, veuillez fournir votre reference de transaction.";
  }
  if (lower.includes("withdraw") || lower.includes("retrait")) {
    return "Les retraits sont traites sous 15 minutes en moyenne. Le montant minimum est de 1.0 unite et le maximum de 5,000 par transaction. Assurez-vous que votre KYC est verifie pour les montants superieurs a 500 USD.";
  }
  if (lower.includes("kyc") || lower.includes("verification") || lower.includes("identite")) {
    return "Le processus KYC necessite une piece d'identite (recto/verso) et un selfie. La verification prend generalement 24h. Verifiez que vos documents sont lisibles et a jour dans la section Profil.";
  }
  if (lower.includes("carte") || lower.includes("card") || lower.includes("visa")) {
    return "Pour gerer vos cartes virtuelles, rendez-vous dans la section Cartes. Vous pouvez creer, geler/degeler et configurer les limites de vos cartes VISA virtuelles.";
  }
  if (lower.includes("swap") || lower.includes("exchange") || lower.includes("echang")) {
    return "Le swap utilise le taux de consensus PimPay mis a jour en temps reel. Rendez-vous dans la section Swap pour echanger vos devises. Les cotations ont une duree d'expiration pour vous proteger.";
  }
  if (lower.includes("staking") || lower.includes("epargne") || lower.includes("apy")) {
    return "Le staking PimPay vous permet de bloquer vos tokens et de recevoir des recompenses basees sur le taux APY actuel. Rendez-vous dans la section Staking pour commencer.";
  }
  if (lower.includes("bonjour") || lower.includes("hello") || lower.includes("salut") || lower.includes("hi")) {
    return "Bonjour ! Je suis Elara, votre assistante PimPay. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur les depots, retraits, KYC, cartes virtuelles, ou tout autre sujet.";
  }

  return "Merci pour votre message. Un agent du support PimPay va analyser votre demande et vous repondre dans les plus brefs delais. En attendant, n'hesitez pas a consulter notre Centre d'Aide pour des reponses immediates.";
}
