// app/api/pi-pay/charge/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = match[1];
    const user = verifyToken(token);
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { amount, currency, method } = body;

    // Example call to Pi Mobile Pay internal API or payment provider.
    const resp = await fetch(process.env.PIMOBILEPAY_API_URL + "/payments/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PIMOBILEPAY_SERVICE_KEY}`,
      },
      body: JSON.stringify({ userId: user.sub, amount, currency, method }),
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: data }, { status: 502 });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
