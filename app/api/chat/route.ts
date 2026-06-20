import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  generateElaraReply,
  detectSupportIntent,
  SUPPORT_INTENT_REPLY,
  type ElaraHistoryMessage,
} from "@/lib/elara-brain";
import {
  GUEST_COOKIE,
  guestCookieOptions,
  newGuestId,
  readGuestId,
} from "@/lib/guest-session";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Identité du demandeur
// ---------------------------------------------------------------------------
// - Utilisateur connecté  → on cloisonne par userId (son User.id réel).
// - Admin / Agent         → accès à tous les tickets.
// - Visiteur non connecté → on cloisonne par un identifiant d'invité stable
//                           stocké dans un cookie. Chaque invité ne voit QUE
//                           ses propres conversations.
async function resolveIdentity() {
  const user = await auth().catch(() => null);
  const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

  if (user?.id) {
    return { userId: user.id as string, guestId: null as string | null, isAdmin, newGuestCookie: null as string | null };
  }

  // Visiteur : on lit (ou on crée) son identifiant d'invité.
  let guestId = await readGuestId();
  let newGuestCookie: string | null = null;
  if (!guestId) {
    guestId = newGuestId();
    newGuestCookie = guestId;
  }
  return { userId: null as string | null, guestId, isAdmin, newGuestCookie };
}

// Attache le cookie invité à la réponse si on vient de le générer.
function withGuestCookie(res: NextResponse, newGuestCookie: string | null) {
  if (newGuestCookie) {
    res.cookies.set(GUEST_COOKIE, newGuestCookie, guestCookieOptions());
  }
  return res;
}

// Construit le filtre de propriété d'un ticket selon l'identité.
function ownershipWhere(
  identity: { userId: string | null; guestId: string | null; isAdmin: boolean },
  extra: Record<string, any> = {},
) {
  if (identity.isAdmin) return { ...extra };
  if (identity.userId) return { ...extra, userId: identity.userId };
  // Invité : ticket anonyme contenant au moins un message émis par cet invité.
  return {
    ...extra,
    userId: null,
    messages: { some: { senderId: identity.guestId ?? "__none__" } },
  };
}

// ---------------------------------------------------------------------------
// GET — Liste des tickets OU un ticket précis avec ses messages
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity();
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (ticketId) {
      // On verifie d'abord la propriete du ticket.
      const owned = await prisma.supportTicket.findFirst({
        where: ownershipWhere(identity, { id: ticketId }),
        select: { id: true },
      });

      // Accuses de reception facon WhatsApp : quand le proprietaire (client/invite)
      // OUVRE la conversation, les messages du SUPPORT sont marques comme LUS
      // (et donc livres). Le support verra alors ses coches passer au bleu.
      if (owned && !identity.isAdmin) {
        const now = new Date();
        await prisma.message
          .updateMany({
            where: { ticketId: owned.id, senderId: "SUPPORT", readAt: null },
            data: { deliveredAt: now, readAt: now },
          })
          .catch(() => {});
      }

      const ticket = owned
        ? await prisma.supportTicket.findUnique({
            where: { id: owned.id },
            include: {
              messages: { orderBy: { createdAt: "asc" } },
              user: { select: { name: true, email: true, avatar: true } },
            },
          })
        : null;
      return withGuestCookie(NextResponse.json({ ticket }), identity.newGuestCookie);
    }

    const tickets = await prisma.supportTicket.findMany({
      where: ownershipWhere(identity),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    // En chargeant sa liste de conversations, le client "recoit" les messages
    // du support : on les marque LIVRES (2 coches grises) sans les marquer lus.
    if (!identity.isAdmin && tickets.length > 0) {
      await prisma.message
        .updateMany({
          where: {
            ticketId: { in: tickets.map((t) => t.id) },
            senderId: "SUPPORT",
            deliveredAt: null,
          },
          data: { deliveredAt: new Date() },
        })
        .catch(() => {});
    }

    return withGuestCookie(NextResponse.json({ tickets }), identity.newGuestCookie);
  } catch (error: any) {
    console.error("CHAT_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du chargement de la conversation" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Envoi d'un message (création du ticket si besoin) + réponse d'Elara
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity();
    const body = await req.json();
    const { ticketId, message, subject } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const sanitizedMessage = message.trim();
    const { isAdmin } = identity;

    // Detection d'un message "image" : contenu au format markdown ![image](url).
    const IMAGE_MSG_RE = /^!\[image\]\((https?:\/\/[^\s)]+)\)$/i;
    const isImageMessage = IMAGE_MSG_RE.test(sanitizedMessage);
    const IMAGE_ACK_REPLY =
      "Merci, j'ai bien recu votre image. Un conseiller va l'examiner. N'hesitez pas a ajouter un message pour preciser votre demande.";

    // senderId de l'expéditeur : "SUPPORT" pour un agent, sinon l'identifiant
    // de propriété (userId réel ou identifiant d'invité).
    const ownerSenderId = identity.userId || identity.guestId || "GUEST";
    const senderId = isAdmin ? "SUPPORT" : ownerSenderId;

    let ticket;

    if (!ticketId) {
      ticket = await prisma.supportTicket.create({
        data: {
          userId: identity.userId || null,
          subject: subject || sanitizedMessage.slice(0, 50),
          messages: { create: { senderId, content: sanitizedMessage } },
        },
      });
    } else {
      ticket = await prisma.supportTicket.findFirst({
        where: ownershipWhere(identity, { id: ticketId }),
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
      }

      await prisma.message.create({
        data: { ticketId: ticket.id, senderId, content: sanitizedMessage },
      });
    }

    // ---- Réponse automatique d'Elara (jamais pour un message d'agent) ----
    if (!isAdmin) {
      let elaraReply: string;

      if (isImageMessage) {
        // Pas de generation IA sur une URL d'image : accuse de reception simple.
        elaraReply = IMAGE_ACK_REPLY;
      } else if (detectSupportIntent(sanitizedMessage)) {
        // L'utilisateur veut un humain : Elara collecte sa préoccupation
        // et le rassure en attendant la prise en charge par le support.
        elaraReply = SUPPORT_INTENT_REPLY;
        // On remonte la priorité du ticket pour le support.
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { priority: "HIGH" },
        }).catch(() => {});
      } else {
        // Réponse précise via l'IA, avec le contexte de la conversation.
        const allMsgs = await prisma.message.findMany({
          where: { ticketId: ticket.id },
          orderBy: { createdAt: "asc" },
        });

        const history: ElaraHistoryMessage[] = allMsgs.map((m) => ({
          role: m.senderId === "ELARA_AI" || m.senderId === "SUPPORT" ? "assistant" : "user",
          content: m.content,
        }));
        // Le dernier message (celui qu'on vient d'enregistrer) est passé à part.
        history.pop();

        elaraReply = await generateElaraReply({ message: sanitizedMessage, history });
      }

      await prisma.message.create({
        data: { ticketId: ticket.id, senderId: "ELARA_AI", content: elaraReply },
      });
    }

    const updated = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return withGuestCookie(NextResponse.json({ ticket: updated }), identity.newGuestCookie);
  } catch (error: any) {
    console.error("CHAT_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 });
  }
}
