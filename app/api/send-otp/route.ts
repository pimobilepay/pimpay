export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import Twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    const client = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Code PIMPAY : ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone, // Exemple : "+242065540305"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Twilio error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
