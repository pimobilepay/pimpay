// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

type Body = {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  userId?: string;
  max_tokens?: number;
};

// Simple in-memory rate limiter (per user/IP) - lightweight demo only
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const state = rateMap.get(key);
  if (!state || now > state.reset) {
    rateMap.set(key, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return false;
  }
  state.count += 1;
  if (state.count > RATE_LIMIT_MAX) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Basic rate limiting using IP or provided userId
    const ip = req.headers.get("x-forwarded-for") || req.ip || "anonymous";
    const key = body.userId ? `u:${body.userId}` : `ip:${ip}`;
    if (isRateLimited(key)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Optional server-side sanitization: limit message size
    const totalChars = body.messages.reduce((s, m) => s + (m.content?.length || 0), 0);
    if (totalChars > 10000) {
      return NextResponse.json(
        { error: "Messages too long" },
        { status: 413 }
      );
    }

    // Build payload for OpenAI (Chat Completions)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing API key" }, { status: 500 });
    }

    const payload = {
      model: "gpt-4o-mini", // change to preferred model
      messages: body.messages,
      max_tokens: body.max_tokens ?? 512,
      temperature: 0.2,
      // You can add other params (top_p, presence_penalty, stream, etc.)
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "OpenAI error", status: res.status, body: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    // Return the assistant message (shape depends on model response)
    const assistant = data?.choices?.[0]?.message || null;

    return NextResponse.json({ assistant, raw: data });
  } catch (err: any) {
    console.error("API /api/chat error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
