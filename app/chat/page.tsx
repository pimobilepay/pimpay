"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Send, Sparkles, Plus, Clock,
  Loader2, MessageCircle, ChevronRight,
  ShieldCheck, X, Paperclip, FileText, Image as ImageIcon,
  Bot, Headphones, User, Zap, HelpCircle, Phone, Check, CheckCheck
} from "lucide-react";
import VoipCallOverlay from "@/components/VoipCallOverlay";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
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
  createdAt: string;
  messages: Message[];
}

// FAQ Questions frequentes avec reponses instantanees d'Elara.
// `key` pointe vers chat.faq.<key> dans les fichiers de traduction.
const FAQ_ITEMS = [
  { key: "deposit", category: "depot" },
  { key: "withdraw", category: "retrait" },
  { key: "swap", category: "swap" },
  { key: "card", category: "carte" },
  { key: "kyc", category: "kyc" },
  { key: "p2p", category: "transfert" },
  { key: "technical", category: "probleme" },
  { key: "support", category: "support" },
];

// Composant Badge pour identifier l'expediteur
function SenderBadge({ senderId }: { senderId: string }) {
  const { t } = useLanguage();
  const isElara = senderId === "ELARA_AI";
  const isSupport = senderId === "SUPPORT";
  
  if (isElara) {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Bot size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">{t("chat.title")}</span>
        <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">{t("chat.tagAi")}</span>
      </div>
    );
  }
  
  if (isSupport) {
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <Headphones size={10} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{t("chat.supportName")}</span>
        <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">{t("chat.tagAgent")}</span>
      </div>
    );
  }
  
  return null;
}

// Signature compacte d'une liste de messages : change des qu'un message est
// ajoute OU qu'un accuse de reception evolue (livre/lu). Sert a declencher le
// rafraichissement du polling pour mettre a jour les coches.
function messagesSignature(messages: Message[]): string {
  return messages.map((m) => `${m.id}:${m.deliveredAt ? 1 : 0}:${m.readAt ? 1 : 0}`).join("|");
}

// Composant pour afficher un message
// Detecte un message image au format markdown ![image](url) eventuellement suivi
// d'une legende sur les lignes suivantes : ![image](url)\nLegende facultative.
// Retourne { url, caption } afin d'afficher l'image et son texte dans une seule
// bulle (image en haut, legende en dessous, facon WhatsApp).
const IMAGE_MSG_RE = /^!\[image\]\((https?:\/\/[^\s)]+)\)(?:\n([\s\S]*))?$/i;
function parseImageMessage(content: string): { url: string; caption: string } | null {
  const match = content.match(IMAGE_MSG_RE);
  if (!match) return null;
  return { url: match[1], caption: (match[2] || "").trim() };
}

// Accuses de reception facon WhatsApp affiches sur les messages que J'AI envoyes :
//  - envoye       : 1 coche grise
//  - recu/livre   : 2 coches grises
//  - lu           : 2 coches bleues
function MessageTicks({ msg }: { msg: Message }) {
  if (msg.readAt) {
    return <CheckCheck size={13} className="text-sky-400" aria-label="Lu" />;
  }
  if (msg.deliveredAt) {
    return <CheckCheck size={13} className="text-slate-400" aria-label="Recu" />;
  }
  return <Check size={13} className="text-slate-400" aria-label="Envoye" />;
}

function ChatMessage({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) {
  const { t, locale } = useLanguage();
  const isElara = msg.senderId === "ELARA_AI";
  const isSupport = msg.senderId === "SUPPORT";
  const isLeft = isElara || isSupport;
  const image = parseImageMessage(msg.content);
  const localeTag = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "fr-FR";
  
  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="max-w-[85%]">
        {isLeft && <SenderBadge senderId={msg.senderId} />}
        {!isLeft && isCurrentUser && (
          <div className="flex items-center justify-end gap-1.5 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("chat.you")}</span>
            <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center">
              <User size={10} className="text-slate-300" />
            </div>
          </div>
        )}
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
                src={image.url}
                alt={t("chat.imageAlt")}
                className="max-w-[220px] max-h-[280px] w-full object-cover bg-slate-900"
              />
            </a>
            {image.caption && (
              <p
                className={`px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isLeft ? "text-slate-200" : "text-white"
                }`}
              >
                {image.caption}
              </p>
            )}
          </div>
        ) : (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isElara
              ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-slate-200 rounded-bl-none"
              : isSupport
                ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-slate-200 rounded-bl-none"
                : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-lg shadow-blue-600/20"
          }`}>
            {msg.content}
          </div>
        )}
        <div className={`flex items-center gap-1 mt-1 ${isLeft ? "ml-1 justify-start" : "mr-1 justify-end"}`}>
          <p className="text-[9px] text-slate-600">
            {new Date(msg.createdAt).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}
          </p>
          {!isLeft && isCurrentUser && <MessageTicks msg={msg} />}
        </div>
      </div>
    </div>
  );
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
  const [showFAQ, setShowFAQ] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showVoipCall, setShowVoipCall] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Image televersee mais PAS encore envoyee : on la met en attente jusqu'a ce
  // que l'utilisateur ajoute un message texte (envoi combine image + texte).
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchTickets();
    // Trace la visite (les invités laissent ainsi une trace même sans message).
    // Le serveur ignore automatiquement les utilisateurs connectés.
    fetch("/api/guest/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "/chat" }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeTicket?.messages]);

  // Auto-refresh active ticket every 5s to pick up admin/support replies
  useEffect(() => {
    if (!activeTicket?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat?ticketId=${activeTicket.id}`);
        if (res.ok) {
          const data = await res.json();
          // On rafraichit si le nombre de messages change OU si un accuse de
          // reception evolue (livre/lu) pour mettre a jour les coches.
          if (data.ticket && messagesSignature(data.ticket.messages) !== messagesSignature(activeTicket.messages)) {
            setActiveTicket(data.ticket);
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTicket?.id, activeTicket?.messages]);

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
    // Un message texte est toujours requis. Si une image est en attente,
    // l'utilisateur doit donc obligatoirement ajouter un texte pour l'envoyer.
    if (!messageText || sending || uploading) return;

    const imageToSend = pendingImage;

    setSending(true);
    setInputValue("");
    setPendingImage(null);

    try {
      const currentTicketId = activeTicket?.id || null;

      // Si une image est en attente, on l'envoie dans le MEME message que le
      // texte (format markdown ![image](url)\nLegende). Ainsi l'image et sa
      // legende restent collees dans une seule bulle, facon WhatsApp.
      const outgoingMessage = imageToSend
        ? `![image](${imageToSend})\n${messageText}`
        : messageText;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoingMessage,
          ticketId: currentTicketId
        }),
      });

      if (res.ok) {
        // Show typing indicator for Elara response
        setIsTyping(true);
        
        // Simulate brief typing delay for natural feel
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const data = await res.json();
        setIsTyping(false);
        setActiveTicket(data.ticket);
        fetchTickets();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setIsTyping(false);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // On reinitialise l'input pour permettre de renvoyer le meme fichier ensuite.
    e.target.value = "";
    if (!file || uploading || sending) return;

    // Validation : uniquement des images, taille max 10 Mo.
    if (!file.type.startsWith("image/")) {
      alert(t("chat.invalidImage"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(t("chat.imageTooLarge"));
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "upload failed");
      }

      // L'image n'est PAS envoyee immediatement : on la met en attente.
      // L'utilisateur doit ajouter un message texte avant de pouvoir l'envoyer.
      setPendingImage(data.url);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert(t("chat.uploadError"));
    } finally {
      setUploading(false);
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
                <h1 className="text-sm font-black tracking-tight text-white">{t("chat.title")}</h1>
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{t("chat.online")}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Phone button - only visible when conversation is active */}
            {activeTicket && (
              <button 
                onClick={() => setShowVoipCall(true)} 
                className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl active:scale-90 transition-transform hover:bg-emerald-500/20"
                aria-label={t("chat.callSupport")}
              >
                <Phone size={18} className="text-emerald-400" />
              </button>
            )}
            <button onClick={() => setShowHistory(true)} className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform">
              <Clock size={18} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* VoIP Call Overlay */}
      <VoipCallOverlay 
        isOpen={showVoipCall} 
        onClose={() => setShowVoipCall(false)} 
      />

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-[85%] h-full bg-[#0a0f1e] p-6 animate-in slide-in-from-left duration-300 border-r border-white/10">
             <div className="flex justify-between items-center mb-8 pt-6">
                <h2 className="font-black uppercase text-xs tracking-[0.2em] text-blue-500">{t("chat.conversations")}</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 bg-white/5 rounded-xl"><X size={20} /></button>
             </div>
             <div className="space-y-3 overflow-y-auto h-[80vh]">
               {tickets.length === 0 && <p className="text-xs text-slate-500 text-center py-10">{t("chat.noHistory")}</p>}
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
            {/* Elara Avatar */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-violet-500 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <Bot size={44} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center border-4 border-[#020617]">
                <Zap size={14} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-black mb-1">{t("chat.greeting")}</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[260px] mb-6">
              {t("chat.intro")}
            </p>
            
            {/* Badges de type */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Bot size={12} className="text-blue-400" />
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">{t("chat.badgeAi")}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Headphones size={12} className="text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">{t("chat.badgeSupport")}</span>
              </div>
            </div>
            
            {/* FAQ Section */}
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("chat.faqTitle")}</p>
                <button 
                  onClick={() => setShowFAQ(!showFAQ)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  {showFAQ ? t("chat.seeLess") : t("chat.seeAll")}
                  <ChevronRight size={12} className={`transition-transform ${showFAQ ? "rotate-90" : ""}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {(showFAQ ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 4)).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => sendMessage(t(`chat.faq.${item.key}`))}
                    className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-left active:scale-95 transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-wider group-hover:text-blue-400 transition-colors">{t("chat.faqTag")}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 leading-tight">{t(`chat.faq.${item.key}`)}</p>
                  </button>
                ))}
              </div>
              
              {/* Direct Support Button */}
              <button
                onClick={() => sendMessage(t("chat.supportRequest"))}
                className="w-full mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all hover:border-emerald-500/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Headphones size={18} className="text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-emerald-400">{t("chat.contactSupport")}</p>
                    <p className="text-[10px] text-emerald-600">{t("chat.talkToAgent")}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-emerald-500" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTicket.messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                msg={msg} 
                isCurrentUser={msg.senderId !== "ELARA_AI" && msg.senderId !== "SUPPORT"} 
              />
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                      <Bot size={10} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">{t("chat.title")}</span>
                    <span className="text-[9px] text-blue-400/60 italic">{t("chat.typing")}</span>
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - NO BOTTOM NAV HERE */}
      <div className="shrink-0 bg-[#020617] border-t border-white/5 px-4 pt-4 pb-12 z-40">
        {/* Apercu de l'image en attente : l'utilisateur doit ajouter un texte
            avant de pouvoir l'envoyer. */}
        {pendingImage && (
          <div className="mb-3 flex items-center gap-3 p-2.5 bg-white/[0.04] border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage || "/placeholder.svg"}
                alt={t("chat.imageAlt")}
                className="w-14 h-14 rounded-xl object-cover bg-slate-900 border border-white/10"
              />
              <button
                onClick={() => setPendingImage(null)}
                aria-label={t("chat.removeImage")}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-500 rounded-full active:scale-90 transition-transform shadow-lg"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon size={14} className="text-blue-400 shrink-0" />
              <p className="text-[11px] font-bold text-slate-400 leading-tight">{t("chat.addCaption")}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label={t("chat.uploading")}
            className="w-12 h-12 flex items-center justify-center bg-white/[0.05] border border-white/10 rounded-2xl active:scale-90 transition-all text-slate-400 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={22} className="animate-spin text-blue-400" /> : <Plus size={22} />}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

          <div className="flex-1 flex items-center bg-white/[0.05] border border-white/10 rounded-2xl px-4 focus-within:border-blue-500/50 transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder={pendingImage ? t("chat.addCaption") : t("chat.inputPlaceholder")}
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
