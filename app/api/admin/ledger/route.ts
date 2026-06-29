export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission, PERMISSIONS } from "@/lib/permissions"
import { logAdminAction } from "@/lib/adminAudit"

// GET — écritures + balance de vérification par compte
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.LEDGER_VIEW)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const account = searchParams.get("account") || undefined
  const currency = searchParams.get("currency") || undefined

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      ...(account ? { account } : {}),
      ...(currency ? { currency } : {}),
    },
    orderBy: { entryDate: "desc" },
    take: 200,
  })

  // Balance de vérification (débit/crédit par compte)
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["account", "currency"],
    _sum: { debit: true, credit: true },
  })

  const trialBalance = grouped.map((g) => {
    const debit = g._sum.debit || 0
    const credit = g._sum.credit || 0
    return {
      account: g.account,
      currency: g.currency,
      debit,
      credit,
      balance: Number((debit - credit).toFixed(2)),
    }
  })

  // Vérification de l'équilibre global par devise
  const byCurrency: Record<string, { debit: number; credit: number }> = {}
  for (const tb of trialBalance) {
    byCurrency[tb.currency] ||= { debit: 0, credit: 0 }
    byCurrency[tb.currency].debit += tb.debit
    byCurrency[tb.currency].credit += tb.credit
  }
  const balanceChecks = Object.entries(byCurrency).map(([currency, v]) => ({
    currency,
    totalDebit: Number(v.debit.toFixed(2)),
    totalCredit: Number(v.credit.toFixed(2)),
    difference: Number((v.debit - v.credit).toFixed(2)),
    balanced: Math.abs(v.debit - v.credit) < 0.01,
  }))

  return NextResponse.json({ entries, trialBalance, balanceChecks })
}

// POST — ajustement manuel en partie double
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.LEDGER_MANAGE)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const { debitAccount, creditAccount, amount, currency, description, reference } = body
  const amt = Number(amount)

  if (!debitAccount || !creditAccount || !amt || amt <= 0) {
    return NextResponse.json({ error: "Comptes et montant valides requis" }, { status: 400 })
  }
  if (debitAccount === creditAccount) {
    return NextResponse.json({ error: "Les comptes débit et crédit doivent différer" }, { status: 400 })
  }

  const ref = reference || `ADJ-${Date.now()}`
  const cur = currency || "USD"

  // Écriture en partie double : un débit et un crédit liés par la même référence
  const created = await prisma.$transaction([
    prisma.ledgerEntry.create({
      data: {
        account: debitAccount,
        debit: amt,
        credit: 0,
        currency: cur,
        description,
        reference: ref,
        type: "MANUAL_ADJUSTMENT",
        createdBy: ctx.payload.id,
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        account: creditAccount,
        debit: 0,
        credit: amt,
        currency: cur,
        description,
        reference: ref,
        type: "MANUAL_ADJUSTMENT",
        createdBy: ctx.payload.id,
      },
    }),
  ])

  await logAdminAction(req, ctx.payload, {
    action: "LEDGER_ADJUSTMENT",
    category: "finance",
    targetId: ref,
    targetType: "ledger",
    details: `Ajustement ${amt} ${cur} : ${debitAccount} -> ${creditAccount}`,
  })

  return NextResponse.json({ ok: true, entries: created })
}
