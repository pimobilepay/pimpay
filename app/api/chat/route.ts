import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function jsonError(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

function isSupport(user: any) {
  return user?.role === "ADMIN" || user?.role === "AGENT";
}

// Fonction d'auto-réponse basée sur les "Quick Questions" et le schéma
function getElaraResponse(msg: string): string {
  const low = msg.toLowerCase();

  if (low.includes("depot") || low.includes("dépôt") || low.includes("retrait")) {
    return "💳 **Finance :** Pour les dépôts et retraits, rendez-vous dans l'onglet Portefeuille. Les dépôts Pi sont instantanés après confirmation, les retraits FIAT (XAF/USD) prennent entre 5 et 15 minutes.";
  }
  
  if (low.includes("carte") || low.includes("visa") || low.includes("virtual card")) {
    return "🎫 **Carte Virtuelle :** Vous pouvez générer une carte VISA Classic, Gold ou Ultra. Elle permet des paiements en USD et XAF. Allez dans la section 'Cartes' pour l'activer.";
  }

  if (low.includes("swap") || low.includes("echanger") || low.includes("convertir")) {
    return "🔄 **Swap :** PimPay vous permet de convertir vos Pi en Fiat (XAF/USD) instantanément selon le cours du jour. Utilisez le bouton 'Swap' sur votre tableau de bord.";
  }

  if (low.includes("kyc") || low.includes("verifier") || low.includes("identité")) {
    return "🛡️ **Sécurité :** Pour vérifier votre compte, téléchargez votre CNI ou Passeport dans votre profil. Le statut passera de 'PENDING' à 'VERIFIED' sous 24h après examen par nos agents.";
  }

  if (low.includes("agent") || low.includes("humain") || low.includes("support")) {
    return "👤 **Support Humain :** J'ai notifié un agent de votre demande. Un membre de l'équipe PimPay vous répondra ici-même dans quelques instants.";
  }

  return "Je suis Elara, votre assistante PimPay. Je ne suis pas sûre de comprendre, mais un agent de support va prendre le relais pour vous aider précisément.";
}

export async function GET(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const admin = isSupport(user);

    if (ticketId) {
      const where = admin
        ? { id: ticketId }
        : user?.id
          ? { id: ticketId, userId: user.id }
          : { id: ticketId, userId: null };

      const ticket = await prisma.supportTicket.findFirst({
        where,
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } },
        },
      });

      if (!ticket) return jsonError("Conversation introuvable", 404);
      return NextResponse.json({ ticket });
    }

    // Un utilisateur guest ne peut pas voir de liste de tickets (il n'a pas d'ID)
    if (!user) return NextResponse.json({ tickets: [] });

    const tickets = await prisma.supportTicket.findMany({
      where: admin ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("CHAT_GET_ERROR:", error);
    return jsonError("Erreur serveur", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const body = await req.json();

    const ticketId = body?.ticketId as string | null;
    const message = body?.message as string;

    if (!message?.trim()) return jsonError("Message vide", 400);

    const sanitizedMessage = message.trim();
    const admin = isSupport(user);

    const result = await prisma.$transaction(async (tx) => {
      let ticket;

      if (!ticketId) {
        // Nouveau ticket (User ou Guest)
        ticket = await tx.supportTicket.create({
          data: {
            userId: user?.id ?? null,
            subject: sanitizedMessage.slice(0, 50) + "...",
            messages: {
              create: {
                senderId: admin ? "SUPPORT" : (user?.id ?? "GUEST"),
                content: sanitizedMessage,
              },
            },
          },
        });
      } else {
        // Ticket existant
        const where = admin ? { id: ticketId } : { id: ticketId, userId: user?.id ?? null };
        ticket = await tx.supportTicket.findFirst({ where });
        
        if (!ticket) throw new Error("NOT_FOUND");

        await tx.message.create({
          data: {
            ticketId: ticket.id,
            senderId: admin ? "SUPPORT" : (user?.id ?? "GUEST"),
            content: sanitizedMessage,
          },
        });
      }

      // 🤖 Réponse automatique d'Elara (seulement si l'utilisateur n'est pas Admin)
      if (!admin) {
        const reply = getElaraResponse(sanitizedMessage);
        await tx.message.create({
          data: {
            ticketId: ticket.id,
            senderId: "ELARA_AI",
            content: reply,
          },
        });
      }

      return await tx.supportTicket.findUnique({
        where: { id: ticket.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, avatar: true } },
        },
      });
    });

    return NextResponse.json({ ticket: result });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") return jsonError("Ticket introuvable", 404);
    return jsonError("Erreur lors de l'envoi", 500);
  }
}
