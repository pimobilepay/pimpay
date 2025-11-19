import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/);
    if (!match) return new NextResponse("Unauthorized", { status: 401 });

    const token = match[1];
    const payload = verifyToken(token);
    if (!payload) return new NextResponse("Invalid token", { status: 401 });

    const userId = req.nextUrl.searchParams.get("userId");

    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    page.drawText(`Chat History - User ${userId}`, {
      x: 30,
      y: height - 40,
      size: 20,
      font,
    });

    let y = height - 80;

    messages.forEach((m) => {
      page.drawText(`${m.role}: ${m.content}`, {
        x: 30,
        y,
        size: 10,
        font,
      });
      y -= 15;
    });

    const pdfBytes = await pdf.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="messages.pdf"`,
      },
    });
  } catch (err) {
    return new NextResponse("Server error", { status: 500 });
  }
}
