'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, RefreshCw, Server } from 'lucide-react'

type MailStatus = { smtp: boolean; imap: boolean; smtpHost?: string; imapHost?: string }

export function MailProtocolStatus() {
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/mail/status', { cache: 'no-store' })
      if (response.ok) setStatus(await response.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><Server size={18} /></div>
          <div><h2 className="font-bold">Canaux de messagerie</h2><p className="text-xs text-slate-400">SMTP pour l'envoi, IMAP pour la réception externe</p></div>
        </div>
        <button onClick={load} aria-label="Actualiser les protocoles" className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { name: 'SMTP', active: status?.smtp, host: status?.smtpHost, description: 'Envoi des réponses et campagnes email.' },
          { name: 'IMAP', active: status?.imap, host: status?.imapHost, description: 'Import des emails externes dans la boîte de réception.' },
        ] as const).map((channel) => (
          <div key={channel.name} className="rounded-2xl border border-white/5 bg-white/[.03] p-4">
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold">{channel.name}</span>{channel.active ? <CheckCircle2 className="text-emerald-400" size={17} /> : <CircleAlert className="text-amber-400" size={17} />}</div>
            <p className="text-xs text-slate-400">{channel.description}</p>
            <p className={`mt-3 text-[10px] font-black uppercase tracking-widest ${channel.active ? 'text-emerald-400' : 'text-amber-400'}`}>{channel.active ? `Connecté${channel.host ? ` · ${channel.host}` : ''}` : 'Non configuré'}</p>
          </div>
        ))}
      </div>
      {!status?.imap && <p className="mt-3 text-[11px] text-slate-500">L'inbox interne reste disponible. Pour recevoir une boîte externe, renseignez les variables IMAP côté environnement du projet.</p>}
    </section>
  )
}

export default MailProtocolStatus
