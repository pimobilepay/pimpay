import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Presence "en train d'ecrire" facon WhatsApp pour le chat Elara / Support.
//
// Le chat utilise un polling (pas de websocket), on stocke donc l'etat de
// frappe en memoire avec une duree de vie courte (TTL). Chaque cote (client ou
// support) "ping" cet endpoint pendant qu'il tape ; l'autre cote interroge
// l'etat pour afficher l'animation des trois points.
//
// Structure : Map<ticketId, { user: timestamp, support: timestamp }>
// Une frappe est consideree active si son timestamp date de moins de TTL_MS.
// ---------------------------------------------------------------------------
type TypingState = { user: number; support: number };

// On attache le store a globalThis pour survivre au hot-reload en dev.
const store: Map<string, TypingState> =
  (globalThis as any).__pimpayTypingStore ?? new Map<string, TypingState>();
(globalThis as any).__pimpayTypingStore = store;

const TTL_MS = 6000;

// Determine le role du demandeur : un admin/agent ecrit en tant que "support",
// tout le reste (utilisateur connecte ou invite) en tant que "user".
async function resolveRole(): Promise<"support" | "user"> {
  const user = await auth().catch(() => null);
  const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";
  return isAdmin ? "support" : "user";
}

function isActive(ts: number | undefined): boolean {
  return typeof ts === "number" && Date.now() - ts < TTL_MS;
}

// POST — Signale que le demandeur est (ou n'est plus) en train d'ecrire.
// Body: { ticketId: string, typing: boolean }
export async function POST(req: NextRequest) {
  try {
    const { ticketId, typing } = await req.json();
    if (!ticketId || typeof ticketId !== "string") {
      return NextResponse.json({ error: "ticketId requis" }, { status: 400 });
    }

    const role = await resolveRole();
    const state = store.get(ticketId) ?? { user: 0, support: 0 };
    // typing=true rafraichit le timestamp ; typing=false l'efface immediatement.
    state[role] = typing ? Date.now() : 0;
    store.set(ticketId, state);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur typing" }, { status: 500 });
  }
}

// GET — Renvoie qui est en train d'ecrire sur le ticket.
// Query: ?ticketId=xxx  →  { user: boolean, support: boolean }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ user: false, support: false });
  }
  const state = store.get(ticketId);
  return NextResponse.json({
    user: isActive(state?.user),
    support: isActive(state?.support),
  });
}
