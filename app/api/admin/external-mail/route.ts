import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { mailConfigRequirements, mailConfigurationStatus, readExternalMail, sendExternalMail } from "@/lib/external-mail";

async function admin(req: Request) {
  const session = await verifyAuth(req as any);
  if (!session || (session.role !== "ADMIN" && session.role !== "BANK_ADMIN")) return null;
  return session;
}

export async function GET(req: Request) {
  if (!await admin(req)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  try {
    const messages = await readExternalMail(Number(new URL(req.url).searchParams.get("limit") || 50));
    return NextResponse.json({ messages, configuration: mailConfigurationStatus() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connexion IMAP impossible", configuration: mailConfigurationStatus(), required: mailConfigRequirements() }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!await admin(req)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.to || !body.subject || !body.html) return NextResponse.json({ error: "Destinataire, sujet et contenu requis" }, { status: 400 });
    const result = await sendExternalMail({ to: body.to, subject: body.subject, html: body.html, text: body.text });
    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Envoi SMTP impossible" }, { status: 503 });
  }
}
      
