"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Send, Sparkles, Plus, Clock,
  Loader2, MessageCircle, ChevronRight,
  ShieldCheck, X, Paperclip, FileText, Image as ImageIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function ChatPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          ticketId: activeTicket?.id || null
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        fetchTickets();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Fichier ${file.name} prêt pour l'envoi (implémentation S3/Upload en cours)`);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#020617] text-white font-sans overflow-hidden z-[9999]">
      {/* Header - Z-Index élevé pour couvrir tout */}
      <div className="shrink-0 px-5 pt-10 pb-4 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => activeTicket ? setActiveTicket(null) : router.back()} className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white">Elara AI</h1>
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">En ligne</p>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setShowHistory(true)} className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform">
            <Clock size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-[85%] h-full bg-[#0a0f1e] p-6 animate-in slide-in-from-left duration-300 border-r border-white/10">
             <div className="flex justify-between items-center mb-8 pt-6">
                <h2 className="font-black uppercase text-xs tracking-[0.2em] text-blue-500">Conversations</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 bg-white/5 rounded-xl"><X size={20} /></button>
             </div>
             <div className="space-y-3 overflow-y-auto h-[80vh]">
               {tickets.length === 0 && <p className="text-xs text-slate-500 text-center py-10">Aucun historique</p>}
               {tickets.map(t => (
                 <button key={t.id} onClick={() => loadTicket(t.id)} className="w-full p-4 bg-white/[0.03] rounded-2xl text-left border border-white/5 active:scale-95 transition-all">
                    <p className="text-sm font-bold truncate text-white">{t.subject}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                 </button>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        {!activeTicket ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <MessageCircle size={40} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Bonjour !</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Je suis Elara. Posez-moi une question pour commencer notre discussion.
            </p>
          </div>
        ) : (
          activeTicket.messages.map((msg) => {
            const isElara = msg.senderId === "ELARA_AI" || msg.senderId === "SUPPORT";
            return (
              <div key={msg.id} className={`flex ${isElara ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isElara 
                    ? "bg-white/[0.05] border border-white/10 text-slate-200 rounded-bl-none" 
                    : "bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/20"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - NO BOTTOM NAV HERE */}
      <div className="shrink-0 bg-[#020617] border-t border-white/5 px-4 pt-4 pb-12 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 flex items-center justify-center bg-white/[0.05] border border-white/10 rounded-2xl active:scale-90 transition-all text-slate-400"
          >
            <Plus size={22} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />

          <div className="flex-1 flex items-center bg-white/[0.05] border border-white/10 rounded-2xl px-4 focus-within:border-blue-500/50 transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ecrire à Elara..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="w-full bg-transparent py-4 text-sm text-white placeholder:text-slate-600 outline-none font-medium"
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || sending}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-2xl disabled:opacity-30 shadow-lg shadow-blue-600/20 active:scale-90 transition-all"
          >
            {sending ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={20} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
