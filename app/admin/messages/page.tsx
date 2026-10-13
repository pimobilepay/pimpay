"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, Mail, MailOpen, RefreshCw, Send, Settings, X } from "lucide-react";
import { toast } from "sonner";

type ExternalMessage = { uid: number; subject: string; from: string; name: string; date?: string; seen: boolean; messageId?: string };

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ExternalMessage[]>([]);
  const [selected, setSelected] = useState<ExternalMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ smtp: false, imap: false });
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ to: "", subject: "", html: "" });

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/external-mail", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connexion IMAP impossible");
      setMessages(data.messages || []); setConfig(data.configuration || { smtp: false, imap: false });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erreur de lecture"); }
    finally { setLoading(false); }
  }, [config]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  async function sendMail(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/external-mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Envoi SMTP impossible");
      toast.success("Email envoyé via SMTP"); setShowCompose(false); setForm({ to: "", subject: "", html: "" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erreur SMTP"); }
  }

  return <main className="min-h-screen bg-[#020617] px-4 pb-24 pt-8 text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-4"><button onClick={() => router.push("/admin")} className="rounded-xl bg-white/5 p-3" aria-label="Retour"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-blue-400">PIMOBIPAY</p><h1 className="text-2xl font-black">Boîte de réception</h1><p className="text-sm text-slate-500">Courriels externes synchronisés par IMAP</p></div></div>
        <div className="flex gap-2"><button onClick={() => setShowCompose(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase"><Send size={15}/> Nouveau</button><button onClick={loadInbox} className="rounded-xl bg-white/5 p-3" aria-label="Actualiser"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button></div>
      </header>
      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/8 bg-[#0a101c] p-4"><Inbox className="mb-3 text-blue-400"/><p className="text-2xl font-black">{messages.length}</p><p className="text-[10px] uppercase tracking-widest text-slate-500">Messages synchronisés</p></div><div className={`rounded-2xl border p-4 ${config.imap ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 bg-amber-400/5"}`}><MailOpen className={config.imap ? "mb-3 text-emerald-400" : "mb-3 text-amber-400"}/><p className="text-sm font-black">{config.imap ? "IMAP connecté" : "IMAP à configurer"}</p><p className="text-[10px] text-slate-500">Réception des courriels</p></div><div className={`rounded-2xl border p-4 ${config.smtp ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 bg-amber-400/5"}`}><Send className={config.smtp ? "mb-3 text-emerald-400" : "mb-3 text-amber-400"}/><p className="text-sm font-black">{config.smtp ? "SMTP connecté" : "SMTP à configurer"}</p><p className="text-[10px] text-slate-500">Envoi des courriels</p></div></section>
      <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a101c]">{messages.length === 0 ? <div className="p-16 text-center text-slate-500"><Settings className="mx-auto mb-3"/><p className="font-bold">Aucun message ou IMAP non configuré</p><p className="mt-2 text-xs">Ajoutez les variables EXTERNAL_IMAP_* dans les variables du projet.</p></div> : messages.map(message => <button key={message.uid} onClick={() => setSelected(message)} className="flex w-full items-center gap-4 border-b border-white/6 p-4 text-left hover:bg-white/[.03]"><div className={`rounded-xl p-3 ${message.seen ? "bg-white/5 text-slate-500" : "bg-blue-500/10 text-blue-400"}`}>{message.seen ? <MailOpen size={17}/> : <Mail size={17}/>}</div><div className="min-w-0 flex-1"><p className={`truncate text-sm ${message.seen ? "font-medium text-slate-300" : "font-black text-white"}`}>{message.subject}</p><p className="truncate text-xs text-slate-500">{message.name || message.from} · {message.from}</p></div><time className="text-[10px] text-slate-600">{message.date ? new Date(message.date).toLocaleString("fr-FR") : ""}</time></button>)}</section>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}><article className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a101c] p-6" onClick={event => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-xs text-blue-400">{selected.from}</p><h2 className="mt-2 text-xl font-black">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{selected.date ? new Date(selected.date).toLocaleString("fr-FR") : ""}</p></div><button onClick={() => setSelected(null)} aria-label="Fermer"><X/></button></div><p className="mt-8 text-sm text-slate-400">Le contenu complet est disponible dans le client IMAP externe. Cette vue affiche les métadonnées synchronisées.</p></article></div>}
      {showCompose && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={sendMail} className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#0a101c] p-6"><div className="flex justify-between"><h2 className="text-xl font-black">Nouveau courriel SMTP</h2><button type="button" onClick={() => setShowCompose(false)}><X/></button></div>{(["to", "subject"] as const).map(field => <input key={field} required value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} placeholder={field === "to" ? "Destinataire" : "Sujet"} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-blue-500"/>)}<textarea required value={form.html} onChange={event => setForm({ ...form, html: event.target.value })} placeholder="Message (HTML accepté)" rows={8} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-blue-500"/><button className="w-full rounded-xl bg-blue-600 py-3 text-xs font-black uppercase">Envoyer via SMTP</button></form></div>}
    </div>
  </main>;
}
      
