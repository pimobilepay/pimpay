"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, Clock, User,
  ChevronRight, Inbox, ShieldAlert,
  Send, X, Loader2, CheckCircle, RefreshCw,
  Phone, PhoneIncoming, PhoneOff, Bot, Headphones, Check, CheckCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// FIX #3b: AdminCallReceiver removed from here — it is now mounted globally
// in app/admin/layout.tsx via AdminGlobalCallReceiver, so it works on every
// admin page, not just this one.
import type { CallState } from "@/components/AdminCallReceiver";

interface TicketMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
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

// Detecte un message image au format markdown ![image](url) eventuellement
// suivi d'une legende. Identique a la logique cote client (app/chat/page.tsx)
// pour un rendu coherent (image en haut, legende en dessous, facon WhatsApp).
const IMAGE_MSG_RE = /^!\[image\]\((https?:\/\/[^\s)]+)\)(?:\n([\s\S]*))?$/i;
function parseImageMessage(content: string): { url: string; caption: string } | null {
  const match = content.trim().match(IMAGE_MSG_RE);
  if (!match) return null;
  return { url: match[1], caption: (match[2] || "").trim() };
}

// Petit badge d'identification de l'expediteur, calque sur la page client :
// Elara IA et le Support restent a GAUCHE, le client est a DROITE.
function AdminSenderBadge({ kind }: { kind: "elara" | "support" | "client" }) {
  if (kind === "elara") {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Bot size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Elara AI</span>
        <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">IA</span>
      </div>
    );
  }
  if (kind === "support") {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <Headphones size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Support PIMOBIPAY</span>
        <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">Agent</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5 mb-1.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Client</span>
      <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center">
        <User size={10} className="text-slate-300" />
      </div>
    </div>
  );
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
  // Vrai quand le CLIENT est en train d'ecrire sur le ticket ouvert.
  const [userTyping, setUserTyping] = useState(false);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingPingRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for incoming calls
  const [currentCallState, setCurrentCallState] = useState<CallState>("idle");
  const [currentCallerId, setCurrentCallerId] = useState<string | null>(null);

  const handleCallStateChange = (state: CallState, callerId?: string) => {
    setCurrentCallState(state);
    if (callerId) setCurrentCallerId(callerId);
    if (state === "idle") setCurrentCallerId(null);
    
    // Show toast notifications for call events
    if (state === "incoming") {
      toast.info("Appel entrant d'un utilisateur", {
        duration: 5000,
        icon: <PhoneIncoming size={18} className="text-amber-400" />,
      });
    } else if (state === "connected") {
      toast.success("Appel connecte", {
        icon: <Phone size={18} className="text-emerald-400" />,
      });
    } else if (state === "ended") {
      toast.info("Appel termine", {
        icon: <PhoneOff size={18} className="text-slate-400" />,
      });
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  // FIX #2: Poll for new user messages every 5s while a ticket is open.
  // Previously there was no auto-refresh — the admin had to manually reload
  // or close/reopen the ticket to see new messages from the user.
  useEffect(() => {
    if (!selectedTicket?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/${selectedTicket.id}`);
        if (!res.ok) return;
        const updated = await res.json();
        if (updated?.messages?.length !== selectedTicket.messages.length) {
          setSelectedTicket(updated);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket?.id, selectedTicket?.messages.length]);

  // Presence "en train d'ecrire" : on interroge l'etat du client toutes les
  // 2,5s tant qu'un dossier est ouvert pour afficher l'animation des points.
  useEffect(() => {
    if (!selectedTicket?.id) {
      setUserTyping(false);
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/typing?ticketId=${selectedTicket.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserTyping(!!data.user);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  // Signale au serveur que l'agent (support) est (ou non) en train d'ecrire.
  const pingTyping = (typing: boolean) => {
    const ticketId = selectedTicket?.id;
    if (!ticketId) return;
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, typing }),
    }).catch(() => {});
  };

  // A chaque frappe : ping "typing=true" au plus toutes les 2s, puis programme
  // un "typing=false" 3s apres la derniere frappe (inactivite).
  const handleTypingActivity = () => {
    if (!selectedTicket?.id) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current > 2000) {
      lastTypingPingRef.current = now;
      pingTyping(true);
    }
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      lastTypingPingRef.current = 0;
      pingTyping(false);
    }, 3000);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Erreur protocole PIMOBIPAY : Impossible de charger les donnees");
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
    // On coupe l'indicateur "en train d'ecrire" : la reponse part maintenant.
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    lastTypingPingRef.current = 0;
    pingTyping(false);
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
            // Identification de l'expediteur, calquee sur la page client :
            //  - ELARA_AI       -> Elara IA  (gauche, bleu/violet)
            //  - SUPPORT/ADMIN  -> Support   (gauche, emeraude)
            //  - tout le reste  -> Client    (droite, bleu)
            const isElara = msg.senderId === "ELARA_AI";
            const isSupport = msg.senderId === "SUPPORT" || msg.senderId === "ADMIN";
            const isLeft = isElara || isSupport;
            const kind = isElara ? "elara" : isSupport ? "support" : "client";
            const image = parseImageMessage(msg.content);

            return (
              <div key={msg.id} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[85%]">
                  <AdminSenderBadge kind={kind} />
                  {image ? (
                    <div
                      className={`overflow-hidden rounded-2xl border ${
                        isLeft
                          ? "border-white/10 rounded-bl-none bg-white/[0.03]"
                          : "border-blue-500/30 rounded-br-none bg-blue-600/10"
                      }`}
                    >
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block active:scale-95 transition-transform"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url || "/placeholder.svg"}
                          alt="Image envoyee par le client"
                          className="max-w-[220px] max-h-[280px] w-full object-cover bg-slate-900"
                        />
                      </a>
                      {image.caption && (
                        <p className={`px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          isLeft ? "text-slate-200" : "text-white"
                        }`}>
                          {image.caption}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isElara
                        ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-slate-200 rounded-bl-none"
                        : isSupport
                          ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-slate-200 rounded-bl-none"
                          : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-lg shadow-blue-600/20"
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <p className={`text-[9px] text-slate-600 mt-1 ${isLeft ? "ml-1" : "mr-1 text-right"}`}>
                    {new Date(msg.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Indicateur "en train d'ecrire" du CLIENT (affiche a droite). */}
          {userTyping && (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-[85%]">
                <AdminSenderBadge kind="client" />
                <div className="px-4 py-3 rounded-2xl rounded-br-none bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input + Actions */}
        <div className="p-6 border-t border-white/5 space-y-3">
          {selectedTicket.status !== "CLOSED" ? (
            <>
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    handleTypingActivity();
                  }}
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
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PIMOBIPAY</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Support</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Incoming Call Indicator */}
            {currentCallState === "incoming" && (
              <div className="relative">
                <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/30 animate-pulse">
                  <PhoneIncoming size={18} className="text-amber-400" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              </div>
            )}
            {/* Connected Call Indicator */}
            {currentCallState === "connected" && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                <Phone size={14} className="text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase">En appel</span>
              </div>
            )}
            <button onClick={fetchTickets} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
              <RefreshCw size={18} />
            </button>
          </div>
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
                  {(() => {
                    const raw = ticket.messages[0]?.content;
                    if (!raw) return "Aucun message";
                    {
                      const img = parseImageMessage(raw);
                      if (img) return img.caption || "Image envoyee";
                    }
                    return raw.split('\n\nMessage: ')[1] || raw;
                  })()}
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
  );
}
