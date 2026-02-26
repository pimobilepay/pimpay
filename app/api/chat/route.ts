import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function jsonError(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

function isSupport(user: any) {
  return user?.role === "ADMIN" || user?.role === "AGENT";
}

export async function GET(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    const admin = isSupport(user);

    // --- Lecture d'un ticket précis ---
    if (ticketId) {
      // Cas 1: Admin/Agent => peut lire tout
      // Cas 2: User connecté => seulement ses tickets
      // Cas 3: Invité => seulement tickets guest (userId null)
      const where = admin
        ? { id: ticketId }
        : user?.id
          ? { id: ticketId, userId: user.id }
          : { id: ticketId, userId: null };

      const ticket = await prisma.supportTicket.findFirst({
        where,
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } }, // OK si relation User? (optionnelle)
        },
      });

      if (!ticket) return jsonError("Not found", 404);
      return NextResponse.json({ ticket });
    }

    // --- Liste des tickets ---
    // Sans ticketId, on exige une auth (sinon impossible d’identifier l’invité)
    if (!user) return jsonError("Unauthorized", 401);

    const tickets = await prisma.supportTicket.findMany({
      where: admin ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("CHAT_GET_ERROR:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await auth().catch(() => null);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonError("Body invalide (JSON attendu)", 400);
    }

    const ticketId = (body?.ticketId ?? null) as string | null;
    const subject = (body?.subject ?? null) as string | null;
    const message = (body?.message ?? "") as string;

    if (!message || !message.trim()) return jsonError("Message requis", 400);

    const sanitizedMessage = message.trim();
    const admin = isSupport(user);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Récupérer / Créer le ticket (avec contrôle d’accès)
      let ticket = null as any;

      if (!ticketId) {
        // Création ticket
        ticket = await tx.supportTicket.create({
          data: {
            userId: user?.id ?? null, // ✅ invité => null (PAS "GUEST_USER")
            subject: (subject?.trim() || sanitizedMessage.slice(0, 80)).slice(0, 120),
            messages: {
              create: {
                senderId: admin ? "SUPPORT" : (user?.id ?? "GUEST"),
                content: sanitizedMessage,
              },
            },
          },
        });
      } else {
        // Ticket existant + contrôle d’accès
        const where = admin
          ? { id: ticketId }
          : user?.id
            ? { id: ticketId, userId: user.id }
            : { id: ticketId, userId: null }; // invité peut écrire seulement sur un ticket guest

        ticket = await tx.supportTicket.findFirst({ where });
        if (!ticket) return { notFound: true as const };

        // Ajout message
        await tx.message.create({
          data: {
            ticketId: ticket.id,
            senderId: admin ? "SUPPORT" : (user?.id ?? "GUEST"),
            content: sanitizedMessage,
          },
        });
      }

      // 2) Réponse Elara (uniquement si ce n’est pas un admin/support)
      if (!admin) {
        const allMsgs = await tx.message.findMany({
          where: { ticketId: ticket.id },
          orderBy: { createdAt: "asc" },
        });

        const userMsgs = allMsgs.filter(
          (m) => m.senderId !== "ELARA_AI" && m.senderId !== "SUPPORT"
        );

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

        await tx.message.create({
          data: { ticketId: ticket.id, senderId: "ELARA_AI", content: elaraReply },
        });
      }

      // 3) Retour ticket complet
      const updated = await tx.supportTicket.findUnique({
        where: { id: ticket.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true, avatar: true } },
        },
      });

      return { ticket: updated };
    });

    if ((result as any).notFound) return jsonError("Not found", 404);

    return NextResponse.json({ ticket: (result as any).ticket });
  } catch (error: any) {
    console.error("CHAT_POST_ERROR:", error);
    return jsonError("Internal server error", 500);
  }
}

function getAutoReply(msg: string): string {
  const low = msg.toLowerCase();
  if (low.includes("depot") || low.includes("deposit"))
    return "Dépôts : Menu Portefeuille > Déposer. Traitement < 5min.";
  if (low.includes("retrait") || low.includes("withdraw"))
    return "Retraits : Traités sous 15min. Minimum 1.0.";
  if (low.includes("kyc"))
    return "KYC : Envoyez CNI + Selfie dans votre Profil. Validation sous 24h.";
  return "Je n'ai pas la réponse exacte. Un agent humain (SUPPORT) va vous répondre ici très bientôt.";
}
