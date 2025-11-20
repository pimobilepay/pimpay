export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, phone, password, name } = await req.json();
    if (!password && !phone && !email) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    if (email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return NextResponse.json({ error: "Email used" }, { status: 400 });
    }
    if (phone) {
      const exists = await prisma.user.findUnique({ where: { phone } });
      if (exists) return NextResponse.json({ error: "Phone used" }, { status: 400 });
    }

    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        name,
        password: hashed,
      },
    });

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
