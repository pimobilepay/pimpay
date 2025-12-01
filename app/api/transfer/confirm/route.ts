import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyPiSignature } from "@/lib/pi";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const userPayload = verifyAuth(req); // optional
    const body = await req.json();

    const { transferId, otp, piSignedPayload } = body as {
      transferId: string;
      otp?: string;
      piSignedPayload?: {
        signedMessage: string;
        signature: string;
        publicKey?: string;
      };
    };

    if (!transferId || !otp) {
      return NextResponse.json({ error: "transferId and otp required" }, { status: 400 });
    }

    const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status !== "PENDING") {
      return NextResponse.json({ error: "Transfer not pending" }, { status: 400 });
    }

    if (!transfer.otpHash || !transfer.otpExpiresAt || transfer.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "OTP expired or missing" }, { status: 400 });
    }

    const ok = await bcrypt.compare(otp, transfer.otpHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // If client uses Pi Browser and sends signed payload, verify it
    if (piSignedPayload) {
      const verified = await verifyPiSignature(piSignedPayload);
      if (!verified) {
        return NextResponse.json({ error: "Invalid Pi signature" }, { status: 401 });
      }
      // Optionally store pi transaction id if included in signedMessage
      // Example: we expect signedMessage contains piTxId, else you can pass piTxId separately
      // transfer.piTxId = extractFromSignedMessage(...)
    }

    // TODO: here you'd trigger the actual Pi transfer via your Pi backend or wallet SDK
    // For internal ledgers: debit sender, credit receiver, call external provider, etc.

    // Mark success
    const updated = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: "SUCCESS",
        otpHash: null,
        otpExpiresAt: null,
        piTxId: piSignedPayload?.signedMessage ? "pi-signed" : null,
      },
    });

    // Optionally: create a Transaction record, send receipts, emails, webhooks, etc.

    return NextResponse.json({ ok: true, transfer: updated });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
