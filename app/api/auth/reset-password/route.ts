import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    await sendPasswordResetEmail(auth, email);

    return NextResponse.json({ message: "Email de réinitialisation envoyé" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
