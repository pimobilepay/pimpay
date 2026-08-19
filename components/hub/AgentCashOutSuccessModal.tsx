"use client"

import { CheckCircle2, Copy, X, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface Props {
  transaction: {
    id: string
    reference?: string
    amount: number
    currency: string
    customer?: string
    netAmount?: number
  }
  onClose: () => void
  formatCurrency: (amount: number, currency?: string) => string
}

export function AgentCashOutSuccessModal({ transaction, onClose, formatCurrency }: Props) {
  const [copied, setCopied] = useState(false)
  const reference = transaction.reference || transaction.id

  const copyReference = async () => {
    await navigator.clipboard.writeText(reference)
    setCopied(true)
    toast.success("Référence copiée")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="cash-out-success-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-3 pt-4 text-center">
          <div className="relative flex size-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
            <div className="absolute inset-1 rounded-full border-2 border-emerald-500 animate-[spin_3s_linear_infinite] border-l-transparent" />
            <CheckCircle2 className="size-12 text-emerald-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Transaction validée</p>
          <h2 id="cash-out-success-title" className="text-3xl font-black tracking-tight">Cash-out réussi</h2>
          <p className="text-sm text-slate-400">Le client a confirmé le retrait depuis son application.</p>
        </div>
        <div className="relative mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Montant remis au client</p>
          <p className="mt-2 text-center text-4xl font-black tracking-tight">{formatCurrency(transaction.amount, transaction.currency)}</p>
          <div className="mt-5 flex flex-col gap-3 border-t border-dashed border-white/10 pt-4 text-xs">
            <div className="flex items-center justify-between gap-4"><span className="text-slate-500">Client</span><span className="truncate font-bold text-slate-200">{transaction.customer || "Client"}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-slate-500">Statut</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-black text-emerald-400">Confirmé</span></div>
            <button type="button" onClick={copyReference} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left hover:bg-white/10"><span className="min-w-0 truncate font-mono text-[10px] text-slate-400">{reference}</span>{copied ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400" /> : <Copy className="size-4 shrink-0 text-slate-500" />}</button>
          </div>
        </div>
        <div className="relative mt-5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"><Zap className="size-3 text-blue-400" /> PIMOBIPAY · Confirmation instantanée</div>
        <Button onClick={onClose} className="relative mt-6 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">Terminer</Button>
      </div>
    </div>
  )
}

export default AgentCashOutSuccessModal
