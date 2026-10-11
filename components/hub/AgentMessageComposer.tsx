'use client'

import { useState, useRef } from 'react'
import { FileText, Loader2, MessageSquare, Paperclip, Send, X } from 'lucide-react'
import { toast } from 'sonner'

export function AgentMessageComposer() {
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState<'ADMIN' | 'AGENT'>('ADMIN')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const send = async () => {
    if (!subject.trim() || !message.trim() || sending) return
    setSending(true)
    try {
      let attachmentUrl = ''
      if (file) {
        const form = new FormData()
        form.append('file', file)
        const upload = await fetch('/api/chat/upload', { method: 'POST', body: form })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.error || 'Pièce jointe refusée')
        attachmentUrl = uploaded.url
      }
      const content = attachmentUrl ? `${message.trim()}\n\n![image](${attachmentUrl})` : message.trim()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, subject: subject.trim(), destination }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Envoi impossible')
      toast.success('Message envoyé', { description: `Votre message a été transmis à ${destination === 'ADMIN' ? "l'administrateur" : 'un agent'}.` })
      setSubject(''); setMessage(''); setFile(null); setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi impossible')
    } finally { setSending(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Envoyer un message" className="inline-flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted relative">
        <MessageSquare size={19} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="agent-message-title">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><h2 id="agent-message-title" className="font-bold">Nouveau message</h2><p className="text-xs text-slate-400">Contactez l'administration ou un agent.</p></div><button onClick={() => setOpen(false)} aria-label="Fermer"><X /></button></div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-xs text-slate-400">Destination<select value={destination} onChange={e => setDestination(e.target.value as 'ADMIN' | 'AGENT')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"><option value="ADMIN">Administrateur</option><option value="AGENT">Agent</option></select></label>
              <label className="grid gap-1 text-xs text-slate-400">Objet<input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du message" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" /></label>
              <label className="grid gap-1 text-xs text-slate-400">Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Écrivez votre message..." className="resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" /></label>
              {file && <p className="flex items-center gap-2 text-xs text-emerald-400"><FileText size={14} />{file.name}</p>}
              <div className="flex items-center justify-between gap-3"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} /><button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Paperclip size={15} />Pièce jointe</button><button onClick={send} disabled={!subject.trim() || !message.trim() || sending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}Envoyer</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
