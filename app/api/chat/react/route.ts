import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { readGuestId } from "@/lib/guest-session";

export const dynamic = "force-dynamic";

// Une reaction emoji facon WhatsApp : un emoji + l'identifiant du reacteur.
export type Reaction = { emoji: string; by: string };

// ---------------------------------------------------------------------------
// Identite du reacteur
//  - Admin / Agent          -> "SUPPORT" (peut reagir sur n'importe quel ticket)
//  - Utilisateur connecte   -> son User.id
//  - Visiteur (invite)      -> son identifiant d'invite (cookie)
// ---------------------------------------------------------------------------
async function resolveReactor() {
  const user = await auth().catch(() => null);
  const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";
  if (isAdmin) return { reactorId: "SUPPORT", isAdmin: true, userId: null as string | null, guestId: null as string | null };
  if (user?.id) return { reactorId: user.id as string, isAdmin: false, userId: user.id as string, guestId: null as string | null };
  const guestId = await readGuestId();
  return { reactorId: guestId || "GUEST", isAdmin: false, userId: null as string | null, guestId };
}

// Verifie que le reacteur a le droit d'agir sur le ticket porteur du message.
function canAccessTicket(
  ticket: { userId: string | null; messages: { senderId: string }[] },
  who: { isAdmin: boolean; userId: string | null; guestId: string | null },
): boolean {
  if (who.isAdmin) return true;
  if (who.userId) return ticket.userId === who.userId;
  // Invite : il doit avoir au moins un message dans ce ticket anonyme.
  if (who.guestId) return ticket.userId === null && ticket.messages.some((m) => m.senderId === who.guestId);
  return false;
}

// ---------------------------------------------------------------------------
// POST — Bascule (toggle) une reaction emoji sur un message.
// Body: { messageId: string, emoji: string }
// Regle WhatsApp : une personne ne peut avoir qu'UNE reaction par message.
//  - meme emoji deja pose  -> on le retire (toggle off)
//  - emoji different        -> on remplace sa reaction
//  - aucune reaction        -> on ajoute
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { messageId, emoji } = await req.json();
    if (!messageId || typeof emoji !== "string" || !emoji.trim()) {
      return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
    }

    const who = await resolveReactor();
    if (who.reactorId === "GUEST") {
      return NextResponse.json({ error: "Session introuvable" }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { ticket: { include: { messages: { select: { senderId: true } } } } },
    });
    if (!message || !message.ticket) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    if (!canAccessTicket(message.ticket, who)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Reactions existantes (tableau JSON) nettoyees de celles du reacteur courant.
    const current: Reaction[] = Array.isArray(message.reactions)
      ? (message.reactions as unknown as Reaction[])
      : [];
    const mine = current.find((r) => r.by === who.reactorId);
    const others = current.filter((r) => r.by !== who.reactorId);

    // Toggle : si je reposte le meme emoji, je le retire ; sinon je (re)pose le mien.
    const next: Reaction[] = mine?.emoji === emoji ? others : [...others, { emoji, by: who.reactorId }];

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: next as unknown as object },
      select: { id: true, reactions: true },
    });

    return NextResponse.json({ id: updated.id, reactions: updated.reactions ?? [] });
  } catch (error) {
    console.error("CHAT_REACT_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la reaction" }, { status: 500 });
  }
}
