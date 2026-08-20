import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() { const userId = await getAuthUserId(); if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); const bookings = await prisma.flightBooking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ bookings }); }

export async function POST() { return NextResponse.json({ error: "Use the booking flow endpoint" }, { status: 405 }); }
