import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Empêche l'analyse statique qui fait planter le build
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    // AUTHENTICATION via lib/auth.ts
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body = await req.json();
    const { firstName, lastName, username, name, email, phone, country, birthDate } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        username,
        name,
        email,
        phone,
        country,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        birthDate: true,
        createdAt: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err: unknown) {
    console.error("PUT_USER_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
