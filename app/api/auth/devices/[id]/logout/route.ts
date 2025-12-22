export const runtime = "nodejs";
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get("authorization")
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = auth.split(" ")[1]
    const payload: any = jwt.verify(token, JWT_SECRET)

    const session = await prisma.session.findUnique({
      where: { id: params.id },
    })

    if (!session || session.userId !== payload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.session.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
