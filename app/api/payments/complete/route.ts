import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 })

    const { paymentId, txid } = await req.json()

    // Mise à jour de la transaction dans la base de données
    const transaction = await prisma.transaction.update({
      where: { piPaymentId: paymentId },
      data: { 
        status: "COMPLETED",
        txid: txid,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error("Payment Complete Error:", error)
    return NextResponse.json({ error: "Failed to complete payment" }, { status: 500 })
  }
}
