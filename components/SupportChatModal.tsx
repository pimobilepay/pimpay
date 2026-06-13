"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Loader2, Headphones, Bot, User, Sparkles,
} from "lucide-react";

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

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ticket existant a ouvrir. Si absent, un nouveau ticket sera cree au premier message. */
  ticketId?: string | null;
}

function SenderBadge({ senderId }: { senderId: string }) {
  const isElara = senderId === "ELARA_AI";
  const isSupport = senderId === "SUPPORT";

  if (isElara) {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Bot size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Elara AI</span>
      </div>
    );
  }

  if (isSupport) {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <Headphones size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Support PimPay</span>
      </div>
    );
  }

  return null;
}

function ChatBubbleRow({ msg }: { msg: Message }) {
  const isElara = msg.senderId === "ELARA_AI";
  const isSupport = msg.senderId === "SUPPORT";
  const isLeft = isElara || isSupport;

  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="max-w-[85%]">
        {isLeft ? (
          <SenderBadge senderId={msg.senderId} />
        ) : (
          <div className="flex items-center justify-end gap-1.5 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vous</span>
            <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center">
              <User size={10} className="text-slate-300" />
            </div>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isElara
              ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-slate-200 rounded-bl-none"
              : isSupport
                ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-slate-200 rounded-bl-none"
                : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-lg shadow-blue-600/20"
          }`}
        >
          {msg.content}
        </div>
        <p className={`text-[9px] text-slate-600 mt-1 ${isLeft ? "ml-1" : "mr-1 text-right"}`}>
          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function SupportChatModal({ isOpen, onClose, ticketId }: SupportChatModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Charge le ticket a l'ouverture
  const loadTicket = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat?ticketId=${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) setTicket(data.ticket);
      }
    } catch (err) {
      console.error("Failed to load support ticket:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket(ticketId);
    }
    if (!isOpen) {
      // reset au moment de la fermeture
      setTicket(null);
      setInputValue("");
    }
  }, [isOpen, ticketId, loadTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages, scrollToBottom]);

  // Auto-refresh pour recevoir les reponses du support / admin en temps reel
  useEffect(() => {
    if (!isOpen || !ticket?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat?ticketId=${ticket.id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket && data.ticket.messages.length !== ticket.messages.length) {
            setTicket(data.ticket);
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, ticket?.id, ticket?.messages.length]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setInputValue("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, ticketId: ticket?.id || null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) setTicket(data.ticket);
      }
    } catch (err) {
      console.error("Failed to send support message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full sm:max-w-md h-[85vh] sm:h-[80vh] bg-[#020617] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 px-5 py-4 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Headphones size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-white">Support PimPay</h2>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">En ligne</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer le chat"
                className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 custom-scrollbar">
              {loading && !ticket ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 size={28} className="animate-spin mb-3 text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Chargement de la conversation...</p>
                </div>
              ) : ticket && ticket.messages.length > 0 ? (
                <>
                  {ticket.messages.map((msg) => (
                    <ChatBubbleRow key={msg.id} msg={msg} />
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-4">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">Discutez avec le support</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                    Posez votre question, un agent PimPay vous repondra ici directement.
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 bg-[#020617] border-t border-white/5 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center bg-white/[0.05] border border-white/10 rounded-2xl px-4 focus-within:border-emerald-500/50 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ecrire un message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-slate-600 outline-none font-medium"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || sending}
                  className="w-12 h-12 flex items-center justify-center bg-emerald-600 rounded-2xl disabled:opacity-30 shadow-lg shadow-emerald-600/20 active:scale-90 transition-all"
                  aria-label="Envoyer"
                >
                  {sending ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={20} className="text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
