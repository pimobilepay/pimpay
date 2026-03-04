"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, Clock, User,
  ChevronRight, Inbox, ShieldAlert,
  Send, X, Loader2, CheckCircle, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TicketMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  userId: string | null;
  user?: { username?: string; email?: string; firstName?: string; lastName?: string };
  messages: TicketMessage[];
}

export default function AdminSupportPage() {
  const router = useRouter();
  
  const [data, setData] = useState<{ tickets: Ticket[]; statistics: { total: number; open: number; inProgress: number; closed: number } }>({ 
    tickets: [], 
    statistics: { total: 0, open: 0, inProgress: 0, closed: 0 } 
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // State for ticket detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Erreur protocole PimPay : Impossible de charger les donnees");
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetail = async (ticketId: string) => {
    setTicketLoading(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      if (!res.ok) throw new Error();
      const ticket = await res.json();
      setSelectedTicket(ticket);
    } catch {
      toast.error("Impossible de charger le dossier");
    } finally {
      setTicketLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText, senderId: "ADMIN" }),
      });
      if (!res.ok) throw new Error();
      
      // Refresh the ticket
      const ticketRes = await fetch(`/api/support/${selectedTicket.id}`);
      if (ticketRes.ok) {
        const updated = await ticketRes.json();
        setSelectedTicket(updated);
      }
      setReplyText("");
      toast.success("Reponse envoyee");
      fetchTickets(); // refresh list stats
    } catch {
      toast.error("Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    setClosingTicket(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dossier ferme");
      setSelectedTicket(null);
      fetchTickets();
    } catch {
      toast.error("Erreur de fermeture");
    } finally {
      setClosingTicket(false);
    }
  };

  if (!mounted) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ============ TICKET DETAIL VIEW ============
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => setSelectedTicket(null)} 
              className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black uppercase tracking-tight truncate">{selectedTicket.subject}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                  selectedTicket.status === 'OPEN' ? 'bg-blue-500 text-white' :
                  selectedTicket.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {selectedTicket.status}
                </span>
                <span className="text-[9px] text-slate-500 font-bold">
                  ID-{selectedTicket.id.substring(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-tight">
                {selectedTicket.user?.firstName || selectedTicket.user?.username || "Client Externe"}
                {selectedTicket.user?.lastName ? ` ${selectedTicket.user.lastName}` : ""}
              </p>
              <p className="text-[9px] text-slate-500 font-bold">
                {selectedTicket.user?.email || "Email non disponible"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedTicket.messages.map((msg) => {
            const isAdmin = msg.senderId === "ADMIN";
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${
                  isAdmin 
                    ? 'bg-blue-600 text-white rounded-br-md' 
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-md'
                }`}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[8px] mt-2 ${isAdmin ? 'text-blue-200' : 'text-slate-500'} font-bold`}>
                    {isAdmin ? "ADMIN" : "CLIENT"} - {new Date(msg.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input + Actions */}
        <div className="p-6 border-t border-white/5 space-y-3">
          {selectedTicket.status !== "CLOSED" ? (
            <>
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ecrire une reponse..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500/50 transition-all resize-none min-h-[48px] max-h-[120px]"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100"
                >
                  {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
              <button
                onClick={closeTicket}
                disabled={closingTicket}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
              >
                {closingTicket ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Fermer le dossier
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dossier ferme</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ TICKETS LIST VIEW ============
  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans selection:bg-blue-500/30">
      
      {/* Header Admin */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Support</h1>
          </div>
          <button onClick={fetchTickets} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 pb-20">

      {/* SECTION STATISTIQUES DYNAMIQUES */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-[24px]">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Ouverts</p>
          <p className="text-xl font-black">{data.statistics?.open || 0}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[24px]">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-xl font-black">{data.statistics?.total || 0}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-[24px]">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Clos</p>
          <p className="text-xl font-black">{data.statistics?.closed || 0}</p>
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {data.tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 bg-slate-900/20 rounded-[32px] border border-dashed border-white/10">
            <Inbox size={48} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aucune transmission en attente</p>
          </div>
        ) : (
          data.tickets.map((ticket: Ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 hover:bg-white/5 transition-all group"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">
                      {ticket.user?.username || "Client Externe"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                      ID-{ticket.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                    ticket.status === 'OPEN' ? 'bg-blue-500 text-white' : 
                    ticket.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {ticket.status}
                  </span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock size={10} />
                    <span className="text-[8px] font-black">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
                <h3 className="text-[10px] font-black uppercase text-blue-400 mb-2 tracking-widest">{ticket.subject}</h3>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  {ticket.messages[0]?.content.split('\n\nMessage: ')[1] || ticket.messages[0]?.content || "Aucun message"}
                </p>
              </div>

              <button 
                onClick={() => openTicketDetail(ticket.id)}
                disabled={ticketLoading}
                className="w-full flex items-center justify-between p-4 bg-blue-600 border border-blue-500 rounded-2xl hover:bg-blue-500 transition-all active:scale-[0.98]"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Ouvrir le dossier</span>
                {ticketLoading ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : (
                  <ChevronRight size={16} className="text-white" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      </div>
      </div>
    </div>
  );
}
