import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const userId = await getAuthUserId(); if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); const { id } = await params; const booking = await prisma.flightBooking.findFirst({ where: { id, userId }, include: { paymentTransaction: true } }); if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 }); return NextResponse.json({ booking }); }
