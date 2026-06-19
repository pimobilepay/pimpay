import { NextResponse } from "next/server";
import {
  generateElaraReply,
  detectSupportIntent,
  SUPPORT_INTENT_REPLY,
  type ElaraHistoryMessage,
} from "@/lib/elara-brain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/chat/elara
 *
 * Endpoint direct d'Elara (sans persistance de ticket). Utilise le même
 * cerveau IA que le chat support : Vercel AI Gateway + base de connaissances
 * PimPay, avec repli sur la FAQ si l'IA est indisponible.
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Le format des messages est invalide." },
        { status: 400 },
      );
    }

    const lastUserMessage = String(messages[messages.length - 1]?.content || "").trim();
    if (!lastUserMessage) {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }

    // Demande explicite d'un agent humain → on collecte la préoccupation.
    if (detectSupportIntent(lastUserMessage)) {
      return NextResponse.json({ reply: SUPPORT_INTENT_REPLY });
    }

    const history: ElaraHistoryMessage[] = messages
      .slice(0, -1)
      .map((m: any): ElaraHistoryMessage => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      }))
      .filter((m: ElaraHistoryMessage) => m.content.length > 0);

    const reply = await generateElaraReply({ message: lastUserMessage, history });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erreur Elara AI:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec Elara." },
      { status: 500 },
    );
  }
}
