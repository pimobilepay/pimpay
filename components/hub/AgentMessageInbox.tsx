'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox, Loader2, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'

type Ticket = { id: string; subject: string; messages: { id: string; senderId: string; content: string }[] }

export function AgentMessageInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => { setLoading(true); try { const res = await fetch('/api/chat', { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setTickets((data.tickets || []).filter((ticket: Ticket) => ticket.messages?.some(message => message.senderId === 'SUPPORT'))) } catch (error) { toast.error(error instanceof Error ? error.message : 'Chargement impossible') } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])
  return <><button onClick={() => { setOpen(true); load() }} aria-label="Messages reçus" className="relative inline-flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-muted"><Inbox size={19} />{tickets.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-500 px-1 text-[10px] font-black text-white">{tickets.length}</span>}</button>{open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Messages reçus</h2><p className="text-xs text-slate-400">Réponses de l'administration</p></div><button onClick={() => setOpen(false)} aria-label="Fermer"><X /></button></div>{loading ? <Loader2 className="mx-auto animate-spin" /> : tickets.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Aucun message reçu.</p> : <div className="grid gap-2">{tickets.map(ticket => <div key={ticket.id} className="rounded-2xl bg-white/5 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><MessageSquare size={15} className="text-blue-300" />{ticket.subject}</div>{ticket.messages.filter(message => message.senderId === 'SUPPORT').map(message => <p key={message.id} className="mt-2 rounded-xl bg-blue-600/15 p-2 text-sm text-slate-200">{message.content}</p>)}</div>)}</div>}</div></div>}</>
}
export default AgentMessageInbox
