import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuration manquante: ${name}`);
  return value;
}

export async function sendExternalMail(input: { to: string; subject: string; html: string; text?: string }) {
  const transporter = nodemailer.createTransport({
    host: required("EXTERNAL_SMTP_HOST"),
    port: Number(process.env.EXTERNAL_SMTP_PORT || 465),
    secure: String(process.env.EXTERNAL_SMTP_SECURE || "true") === "true",
    auth: { user: required("EXTERNAL_SMTP_USER"), pass: required("EXTERNAL_SMTP_PASS") },
  });
  return transporter.sendMail({ from: process.env.EXTERNAL_SMTP_FROM || required("EXTERNAL_SMTP_USER"), ...input });
}

export async function readExternalMail(limit = 50) {
  const client = new ImapFlow({
    host: required("EXTERNAL_IMAP_HOST"),
    port: Number(process.env.EXTERNAL_IMAP_PORT || 993),
    secure: String(process.env.EXTERNAL_IMAP_SECURE || "true") === "true",
    auth: { user: required("EXTERNAL_IMAP_USER"), pass: required("EXTERNAL_IMAP_PASS") },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock(process.env.EXTERNAL_IMAP_MAILBOX || "INBOX");
  try {
    const messages = [];
    const total = Math.max(1, client.mailbox?.exists || 1);
    const start = Math.max(1, total - limit + 1);
    for await (const message of client.fetch(`${start}:*`, { envelope: true, flags: true, source: false })) {
      messages.push({
        uid: message.uid,
        subject: message.envelope.subject || "Sans objet",
        from: message.envelope.from?.[0]?.address || "Inconnu",
        name: message.envelope.from?.[0]?.name || "",
        date: message.envelope.date,
        seen: message.flags?.has("\\Seen") || false,
        messageId: message.envelope.messageId,
      });
    }
    return messages.reverse();
  } finally {
    lock.release();
    await client.logout();
  }
}

export function mailConfigurationStatus() {
  return {
    smtp: Boolean(process.env.EXTERNAL_SMTP_HOST && process.env.EXTERNAL_SMTP_USER && process.env.EXTERNAL_SMTP_PASS),
    imap: Boolean(process.env.EXTERNAL_IMAP_HOST && process.env.EXTERNAL_IMAP_USER && process.env.EXTERNAL_IMAP_PASS),
  };
}

export function mailConfigRequirements() {
  return ["EXTERNAL_SMTP_HOST", "EXTERNAL_SMTP_PORT", "EXTERNAL_SMTP_USER", "EXTERNAL_SMTP_PASS", "EXTERNAL_SMTP_FROM", "EXTERNAL_IMAP_HOST", "EXTERNAL_IMAP_PORT", "EXTERNAL_IMAP_USER", "EXTERNAL_IMAP_PASS", "EXTERNAL_IMAP_MAILBOX"];
}
      
