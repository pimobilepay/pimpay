import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  — List all tickets OR load a single ticket with messages
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    if (ticketId) {
      const ticket = await prisma.supportTicket.findFirst({
        where: isAdmin
          ? { id: ticketId }
          : user?.id
            ? { id: ticketId, userId: user.id }
            : { id: ticketId, userId: null },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } },
        },
      });
      return NextResponse.json({ ticket });
    }

    // List tickets
    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : user?.id ? { userId: user.id } : { userId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("CHAT_GET_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Send a message (create ticket if needed) + Elara auto-reply
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);
    const body = await req.json();
    const { ticketId, message, subject } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const sanitizedMessage = message.trim();
    const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

    // ---- 1. Resolve or create ticket ----
    let ticket;

    if (!ticketId) {
      // New ticket
      ticket = await prisma.supportTicket.create({
        data: {
          userId: user?.id || null,
          subject: subject || sanitizedMessage.slice(0, 50),
          messages: {
            create: {
              senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
              content: sanitizedMessage,
            },
          },
        },
      });
    } else {
      // Existing ticket — verify ownership (admin can access any)
      ticket = await prisma.supportTicket.findFirst({
        where: isAdmin
          ? { id: ticketId }
          : user?.id
            ? { id: ticketId, userId: user.id }
            : { id: ticketId, userId: null },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
      }

      // Add user/admin message
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
          content: sanitizedMessage,
        },
      });
    }

    // ---- 2. Elara AI auto-reply (only when the *user* writes, not admin) ----
    if (!isAdmin) {
      const allMsgs = await prisma.message.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
      });

      // Count user messages (everything except ELARA_AI and SUPPORT)
      const userMsgs = allMsgs.filter(
        (m) => m.senderId !== "ELARA_AI" && m.senderId !== "SUPPORT"
      );

      let elaraReply = "";

      if (userMsgs.length === 1) {
        elaraReply =
          "Bonjour ! Je suis Elara, votre assistante PimPay. Pour mieux vous aider, pouvez-vous me donner votre **Nom complet** ?";
      } else if (userMsgs.length === 2) {
        elaraReply =
          "Merci ! Quelle est votre **adresse email** pour le suivi de ce ticket ?";
      } else if (userMsgs.length === 3) {
        elaraReply =
          "C'est note. Je transmets votre dossier au support PimPay. Comment puis-je vous aider en attendant ?";
      } else {
        elaraReply = getAutoReply(sanitizedMessage);
      }

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: "ELARA_AI",
          content: elaraReply,
        },
      });
    }

    // ---- 3. Return updated ticket ----
    const updated = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error: any) {
    console.error("CHAT_POST_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Elara keyword-based auto-reply helper
// ---------------------------------------------------------------------------
function getAutoReply(msg: string): string {
  const low = msg.toLowerCase();

  if (low.includes("depot") || low.includes("deposit") || low.includes("deposer"))
    return "Pour effectuer un depot, rendez-vous dans Menu > Portefeuille > Deposer. Le traitement est generalement effectue en moins de 5 minutes.";

  if (low.includes("retrait") || low.includes("withdraw") || low.includes("retirer"))
    return "Les retraits sont traites sous 15 minutes. Le minimum est de 1.0 unite. Allez dans Portefeuille > Retirer pour commencer.";

  if (low.includes("kyc") || low.includes("verification") || low.includes("identite"))
    return "Pour le KYC, envoyez votre piece d'identite (recto/verso) et un selfie dans Profil > Verification. La validation prend generalement moins de 24h.";

  if (low.includes("swap") || low.includes("echanger") || low.includes("convertir") || low.includes("conversion"))
    return "Pour echanger vos devises, allez dans Swap. Le taux est calcule en temps reel avec protection contre la volatilite. Vous pouvez convertir entre toutes les devises supportees.";

  if (low.includes("carte") || low.includes("card") || low.includes("visa"))
    return "Pour generer une carte virtuelle, rendez-vous dans la section Cartes. 4 types disponibles : CLASSIC, GOLD, BUSINESS et ULTRA avec des limites differentes.";

  if (low.includes("transfert") || low.includes("envoyer") || low.includes("transfer") || low.includes("send"))
    return "Pour envoyer des fonds, allez dans Transfert. Vous pouvez envoyer vers un autre utilisateur PimPay ou vers un wallet externe. Les frais sont calcules de maniere transparente.";

  if (low.includes("solde") || low.includes("balance") || low.includes("combien"))
    return "Votre solde est visible sur votre tableau de bord principal. Pour voir le detail par devise, allez dans Portefeuille.";

  if (low.includes("sidra") || low.includes("sda"))
    return "Sidra Chain est une blockchain conforme a la Charia integree dans PimPay. Les frais de gaz sont quasi-nuls (~0.0001 SDA). Vous pouvez stocker et echanger des SDA directement.";

  if (low.includes("pi") || low.includes("pioneer") || low.includes("pi network"))
    return "PimPay est integre a Pi Network via le SDK v2.0. Vous pouvez gerer votre solde Pi, faire des swaps et des transferts entre Pioneers directement.";

  if (low.includes("staking") || low.includes("stake"))
    return "Le staking vous permet de bloquer des tokens pour recevoir des recompenses. Le taux APY est mis a jour regulierement. Rendez-vous dans la section Staking pour commencer.";

  if (low.includes("merci") || low.includes("thanks") || low.includes("ok") || low.includes("d'accord"))
    return "Avec plaisir ! N'hesitez pas si vous avez d'autres questions. L'equipe PimPay est la pour vous.";

  if (low.includes("bonjour") || low.includes("salut") || low.includes("hello") || low.includes("hi"))
    return "Bonjour ! Comment puis-je vous aider aujourd'hui ? Je suis Elara, votre assistante PimPay.";

  if (low.includes("probleme") || low.includes("erreur") || low.includes("bug") || low.includes("marche pas"))
    return "Je suis desolee pour ce desagrement. Pouvez-vous me decrire le probleme en detail ? Je vais transmettre votre cas a un agent humain pour une resolution rapide.";

  // Default — escalate to human agent
  return "Je n'ai pas la reponse exacte a votre question. Un agent du support PimPay va vous repondre ici tres bientot. En attendant, n'hesitez pas a preciser votre demande.";
}
