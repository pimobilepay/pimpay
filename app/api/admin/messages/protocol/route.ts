import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const smtpHost = process.env.SMTP_HOST || null
  const smtpPort = process.env.SMTP_PORT || null
  const imapHost = process.env.IMAP_HOST || null
  const imapPort = process.env.IMAP_PORT || null

  return NextResponse.json({
    smtp: {
      configured: Boolean(smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS),
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === "465",
    },
    imap: {
      configured: Boolean(imapHost && process.env.IMAP_USER && process.env.IMAP_PASS),
      host: imapHost,
      port: imapPort,
      secure: process.env.IMAP_SECURE !== "false",
    },
  })
}
