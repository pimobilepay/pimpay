'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox, Loader2, MessageSquare, Send, X } from 'lucide-react'
import { toast } from 'sonner'

type Ticket = { id: string; subject: string; status: string; createdAt: string; user?: { username?: string | null; email?: string | null }; messages: { id: string; senderId: string; content: string; createdAt: string }[] }

export function NormalMessageInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chargement impossible')
      setTickets((data.tickets || []).filter((ticket: Ticket) => ticket.messages?.some((message) => message.senderId !== 'SUPPORT' && message.senderId !== 'ELARA_AI')))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Chargement impossible') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const sendReply = async () => {
    if (!selected || !reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: reply.trim(), senderId: 'SUPPORT' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Réponse impossible')
      toast.success('Réponse envoyée')
      setReply(''); setSelected(null); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Réponse impossible') } finally { setSending(false) }
  }

  return <section className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-xl">
    <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><Inbox size={18} /></div><div><h2 className="font-bold">Messages des agents</h2><p className="text-xs text-slate-400">Messages normaux reçus depuis le Hub</p></div></div><button onClick={load} aria-label="Actualiser les messages" className="text-xs text-slate-400 hover:text-white">Actualiser</button></div>
    {loading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div> : tickets.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">Aucun message normal reçu.</p> : <div className="grid gap-2">{tickets.map(ticket => <button key={ticket.id} onClick={() => setSelected(ticket)} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[.03] p-3 text-left hover:bg-white/[.07]"><MessageSquare size={17} className="text-blue-300" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{ticket.subject}</strong><span className="text-xs text-slate-400">{ticket.user?.username || ticket.user?.email || 'Agent'} · {ticket.messages.at(-1)?.content.slice(0, 80)}</span></span><span className="text-xs text-slate-500">{ticket.status}</span></button>)}</div>}
    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">{selected.subject}</h3><p className="text-xs text-slate-400">{selected.user?.username || selected.user?.email || 'Agent'}</p></div><button onClick={() => setSelected(null)} aria-label="Fermer"><X /></button></div><div className="mb-4 grid max-h-64 gap-2 overflow-y-auto">{selected.messages.map(message => <div key={message.id} className={`rounded-2xl p-3 text-sm ${message.senderId === 'SUPPORT' ? 'ml-8 bg-blue-600/20' : 'mr-8 bg-white/10'}`}>{message.content}</div>)}</div><div className="flex gap-2"><textarea value={reply} onChange={event => setReply(event.target.value)} rows={2} placeholder="Répondre à l'agent..." className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none" /><button onClick={sendReply} disabled={!reply.trim() || sending} className="self-end rounded-xl bg-blue-600 p-3 disabled:opacity-40" aria-label="Envoyer la réponse">{sending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}</button></div></div></div>}
  </section>
}

export default NormalMessageInbox
