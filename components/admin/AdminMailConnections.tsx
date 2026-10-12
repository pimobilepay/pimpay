"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Mail, RefreshCw, Server, ShieldCheck, WifiOff } from "lucide-react"
import { toast } from "sonner"

type ProtocolStatus = {
  smtp: { configured: boolean; host: string | null; port: string | null; secure: boolean }
  imap: { configured: boolean; host: string | null; port: string | null; secure: boolean }
}

export function AdminMailConnections() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/messages/protocol", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Impossible de vérifier les connexions")
      setStatus(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de vérifier les connexions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const protocol = (label: string, icon: typeof Mail, connected: boolean, host: string | null, port: string | null, description: string) => {
    const Icon = icon
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${connected ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Icon size={17} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-white">{label}</p>
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase ${connected ? "text-emerald-300" : "text-slate-500"}`}>
                {connected ? <CheckCircle2 size={12} /> : <WifiOff size={12} />} {connected ? "Connecté" : "Non configuré"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
            {connected && <p className="mt-2 font-mono text-[10px] text-slate-500">{host}:{port}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><Server size={18} /></div><div><h2 className="font-bold">Connexions de messagerie</h2><p className="text-xs text-slate-400">Réception interne et protocoles externes</p></div></div>
        <button onClick={() => void load()} disabled={loading} aria-label="Actualiser les connexions" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {protocol("SMTP", Mail, !!status?.smtp.configured, status?.smtp.host ?? null, status?.smtp.port ?? null, "Envoi des campagnes et réponses par email.")}
        {protocol("IMAP", ShieldCheck, !!status?.imap.configured, status?.imap.host ?? null, status?.imap.port ?? null, "Import des emails entrants dans la boîte de réception admin.")}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/15 bg-blue-500/5 p-3 text-[10px] leading-relaxed text-blue-200/80"><ExternalLink size={13} className="mt-0.5 shrink-0" /> Les paramètres restent côté serveur. Configurez IMAP_HOST, IMAP_PORT, IMAP_USER et IMAP_PASS dans les variables du projet pour activer la réception externe.</div>
    </section>
  )
}

export default AdminMailConnections
