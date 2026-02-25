"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Send, Sparkles, Plus, Clock,
  Loader2, MessageCircle, Trash2, ChevronRight,
  HelpCircle, Wallet, CreditCard, RefreshCcw, ShieldCheck,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: Message[];
}

const quickQuestions = [
  { icon: <Wallet size={16} />, label: "Depot & Retrait", message: "Comment faire un depot ou un retrait ?" },
  { icon: <CreditCard size={16} />, label: "Carte Virtuelle", message: "Comment obtenir ma carte virtuelle VISA ?" },
  { icon: <RefreshCcw size={16} />, label: "Swap Pi/Fiat", message: "Comment fonctionne le swap Pi vers Fiat ?" },
  { icon: <ShieldCheck size={16} />, label: "KYC", message: "Comment verifier mon identite KYC ?" },
  { icon: <HelpCircle size={16} />, label: "Support", message: "Je souhaite parler a un agent du support." },
];

export default function ChatPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeTicket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat?ticketId=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setShowHistory(false);
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || sending) return;

    setSending(true);
    setInputValue("");

    try {
      const body: Record<string, string> = { message: messageText };
      if (activeTicket) {
        body.ticketId = activeTicket.id;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        // Refresh tickets list
        fetchTickets();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setActiveTicket(null);
    setShowHistory(false);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] text-white font-sans">
      {/* Header */}
      <div className="shrink-0 px-5 pt-8 pb-4 bg-[#020617] border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (showHistory) {
                  setShowHistory(false);
                } else if (activeTicket) {
                  setActiveTicket(null);
                } else {
                  router.back();
                }
              }}
              className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight">Elara AI</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En ligne</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
              aria-label="Conversation history"
            >
              <Clock size={18} className="text-slate-400" />
            </button>
            <button
              onClick={startNewChat}
              className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-2xl active:scale-90 transition-transform"
              aria-label="New conversation"
            >
              <Plus size={18} className="text-blue-400" />
            </button>
          </div>
        </div>
      </div>

      {/* History Sidebar Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-[85%] max-w-[340px] h-full bg-[#0a0f1e] border-r border-white/5 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 pt-10 flex items-center justify-between border-b border-white/5">
              <h2 className="text-sm font-black uppercase tracking-wider">Conversations</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-transform">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="text-blue-500 animate-spin" />
                </div>
              )}
              {!loading && tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageCircle size={32} className="text-slate-700 mb-3" />
                  <p className="text-xs text-slate-600 font-bold">Aucune conversation</p>
                </div>
              )}
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => loadTicket(ticket.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    activeTicket?.id === ticket.id
                      ? "bg-blue-600/10 border-blue-500/30"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold truncate flex-1">{ticket.subject}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      ticket.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      ticket.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  {ticket.messages?.[0] && (
                    <p className="text-[11px] text-slate-500 mt-1.5 truncate">{ticket.messages[0].content}</p>
                  )}
                  <p className="text-[9px] text-slate-700 mt-2 font-bold">{formatDate(ticket.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!activeTicket ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center px-6 pt-10 pb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-center mb-2">Bienvenue sur Elara AI</h2>
            <p className="text-xs text-slate-500 text-center max-w-[280px] leading-relaxed">
              Votre assistant intelligent PimPay. Posez-moi vos questions ou choisissez un sujet ci-dessous.
            </p>

            <div className="w-full mt-8 space-y-3">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">
                Questions rapides
              </p>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q.message)}
                  disabled={sending}
                  className="w-full flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl active:scale-[0.98] transition-all hover:bg-white/5 group text-left"
                >
                  <div className="p-2.5 bg-blue-600/10 rounded-xl text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    {q.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{q.label}</p>
                    <p className="text-[11px] text-slate-600 truncate">{q.message}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-700 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              ))}
            </div>

            {/* Recent Conversations */}
            {tickets.length > 0 && (
              <div className="w-full mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">
                    Conversations recentes
                  </p>
                  <button onClick={() => setShowHistory(true)} className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    Tout voir
                  </button>
                </div>
                {tickets.slice(0, 3).map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => loadTicket(ticket.id)}
                    className="w-full text-left p-4 bg-white/[0.02] border border-white/5 rounded-2xl active:scale-[0.98] transition-all hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate flex-1">{ticket.subject}</p>
                      <p className="text-[9px] text-slate-700 font-bold shrink-0 ml-2">{formatDate(ticket.createdAt)}</p>
                    </div>
                    {ticket.messages?.[0] && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{ticket.messages[0].content}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat Messages */
          <div className="px-4 py-4 space-y-3">
            {activeTicket.messages.map((msg) => {
              const isUser = msg.senderId !== "ELARA_AI";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${isUser ? "order-1" : "order-1"}`}>
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Elara AI</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white/[0.04] border border-white/5 text-slate-300 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`text-[9px] text-slate-700 mt-1 px-1 ${isUser ? "text-right" : "text-left"}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Elara AI</span>
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/5 rounded-bl-md">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 pb-6 pt-3 bg-[#020617] border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-blue-500/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ecrivez votre message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-slate-600 outline-none font-medium"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || sending}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-2xl active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100 shadow-lg shadow-blue-600/20"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
