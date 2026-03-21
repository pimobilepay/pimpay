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

    let ticket;

    if (!ticketId) {
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

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: isAdmin ? "SUPPORT" : (user?.id || "GUEST"),
          content: sanitizedMessage,
        },
      });
    }

    // ---- 2. Elara AI Logic with Instant FAQ Priority ----
    if (!isAdmin) {
      const allMsgs = await prisma.message.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
      });

      const userMsgs = allMsgs.filter(
        (m) => m.senderId !== "ELARA_AI" && m.senderId !== "SUPPORT"
      );

      const faqResponse = getAutoReply(sanitizedMessage);
      const isKnownQuestion = !faqResponse.includes("Je n'ai pas trouve de reponse precise");

      let elaraReply = "";

      // Si c'est une question identifiée, on répond direct sans tunnel
      if (isKnownQuestion) {
        elaraReply = faqResponse;
      } 
      // Sinon, tunnel de collecte de données standard
      else if (userMsgs.length === 1) {
        elaraReply = "Bonjour ! Je suis Elara, votre assistante PimPay. Pour mieux vous aider, pouvez-vous me donner votre **Nom complet** ?";
      } else if (userMsgs.length === 2) {
        elaraReply = "Merci ! Quelle est votre **adresse email** pour le suivi de ce ticket ?";
      } else if (userMsgs.length === 3) {
        elaraReply = "C'est note. Je transmets votre dossier au support PimPay. Comment puis-je vous aider en attendant ?";
      } else {
        elaraReply = faqResponse;
      }

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderId: "ELARA_AI",
          content: elaraReply,
        },
      });
    }

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
// Elara FAQ — Updated with Visual Precisions (Congo-Brazza & DRC)
// ---------------------------------------------------------------------------
interface FAQEntry {
  keywords: string[];
  response: string;
  category: string;
}

const ELARA_FAQ: FAQEntry[] = [
  {
    keywords: ["depot", "deposit", "deposer", "alimenter", "recharger", "ajouter argent"],
    response: "Pour alimenter votre compte PimPay :\n\n1. Allez sur la page **Depot**.\n2. Cliquez sur l'onglet **CRYPTO**.\n3. Utilisez l'option **PI NETWORK GCV BRIDGE** pour vos Pi (actuellement en Testnet).\n\n*Note : Les recharges directes via Mobile Money (MTN/Airtel) seront actives lors du passage au Mainnet.*",
    category: "depot"
  },
  {
    keywords: ["retrait", "withdraw", "retirer", "recuperer", "sortir argent"],
    response: "Pour effectuer un retrait sur **PimPay** :\n\n1. Allez sur la page **Retrait**.\n2. Choisissez l'onglet **MOBILE** (pour M-Pesa, Orange, Airtel, Africell) ou **VIREMENT BANCAIRE**.\n3. Entrez le numero beneficiaire et le montant en Pi.\n4. **Statut :** Les retraits s'operent sur le Testnet pour le moment. Le cash-out reel sera disponible au Mainnet.",
    category: "retrait"
  },
  {
    keywords: ["mpay", "m-pay", "map", "boutique", "magasin", "payer"],
    response: "La page **MPay** est votre hub d'utilisation :\n\n- **Map of Pi :** Visualisez les commercants (Dakar, etc.) acceptant le Pi.\n- **Scanner/Payer :** Effectuez vos paiements marchands en un clic.\n- **P2P :** Retrouvez vos contacts recents pour des transferts rapides.",
    category: "mpay"
  },
  {
    keywords: ["swap", "echanger", "convertir", "conversion"],
    response: "Pour echanger vos devises, allez dans **Swap**. Vous pouvez convertir vos Pi vers d'autres devises ou cryptos. Le taux est calcule en temps reel (0.1% de frais).",
    category: "swap"
  },
  {
    keywords: ["carte", "card", "visa", "virtuelle"],
    response: "Les cartes virtuelles PimPay (Classic, Gold, Business, Ultra) sont utilisables partout ou Visa est acceptee. Rendez-vous dans l'onglet **Card** de la page Depot pour voir les options bientot disponibles.",
    category: "carte"
  },
  {
    keywords: ["kyc", "verification", "identite"],
    response: "La validation KYC (< 24h) est necessaire pour augmenter vos limites de retrait. Allez dans **Profil** > **Verification** pour uploader vos documents.",
    category: "kyc"
  },
  {
    keywords: ["frais", "fees", "commission"],
    response: "**Tarifs PimPay :**\n- Transfert P2P : 1%\n- Swap : 0.1%\n- Depot/Retrait : 2-3.5% selon l'operateur.\n\nTous les frais sont detailles avant chaque validation.",
    category: "frais"
  },
  {
    keywords: ["merci", "thanks", "ok", "parfait", "super"],
    response: "Avec plaisir ! Je suis la pour vous aider. N'hesitez pas si vous avez d'autres questions - l'equipe PimPay et moi sommes a votre service 24/7.",
    category: "politeness"
  },
  {
    keywords: ["bonjour", "salut", "hello", "hi"],
    response: "Bonjour ! Je suis **Elara**, votre assistante intelligente PimPay.\n\nComment puis-je vous aider aujourd'hui ? Je peux vous guider pour vos depots, retraits ou l'utilisation de MPay.",
    category: "politeness"
  },
];

function getAutoReply(msg: string): string {
  const low = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const faq of ELARA_FAQ) {
    for (const keyword of faq.keywords) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (low.includes(normalizedKeyword)) {
        return faq.response;
      }
    }
  }

  return "Je n'ai pas trouve de reponse precise a votre question dans ma base de connaissances.\n\nUn agent du support PimPay va vous repondre ici tres bientot. En attendant, n'hesitez pas a preciser votre demande !";
}
