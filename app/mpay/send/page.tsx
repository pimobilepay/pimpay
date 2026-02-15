"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Search, Send, Users, Delete,
  Loader2, ShieldCheck, Fingerprint, Zap,
  MessageSquare, CheckCircle2, ChevronRight,
  User, X
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const CONTACTS = [
  { id: "u1", name: "Amadou Diallo", username: "@amadou", avatar: "AD", lastSent: "5.0 Pi" },
  { id: "u2", name: "Fatou Sow", username: "@fatou", avatar: "FS", lastSent: "12.0 Pi" },
  { id: "u3", name: "Ibrahim Keita", username: "@ibrahim", avatar: "IK", lastSent: "3.5 Pi" },
  { id: "u4", name: "Aissatou Ba", username: "@aissa", avatar: "AB", lastSent: "8.0 Pi" },
  { id: "u5", name: "Moussa Traore", username: "@moussa", avatar: "MT", lastSent: "20.0 Pi" },
  { id: "u6", name: "Mariama Diop", username: "@mariama", avatar: "MD", lastSent: null },
  { id: "u7", name: "Ousmane Sy", username: "@ousmane", avatar: "OS", lastSent: null },
];

export default function P2PSendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedTo = searchParams.get("to") || "";

  const [step, setStep] = useState(preSelectedTo ? 2 : 1); // 1: select contact, 2: amount, 3: message, 4: confirm
  const [searchQuery, setSearchQuery] = useState(preSelectedTo);
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(
    preSelectedTo ? CONTACTS.find(c => c.username === preSelectedTo) || null : null
  );
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(3141.59);

  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => setUserBalance(data.balance || 0))
      .catch(() => setUserBalance(3141.59));
  }, []);

  const filteredContacts = CONTACTS.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectContact = (contact: typeof CONTACTS[0]) => {
    setSelectedContact(contact);
    setStep(2);
  };

  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  const handleAmountNext = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error("Veuillez entrer un montant valide");
    }
    if (parseFloat(amount) > userBalance) {
      return toast.error("Solde insuffisant");
    }
    setStep(3);
  };

  const handleConfirmSend = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Transfert envoye avec succes !");
      router.push(`/mpay/success?amount=${amount}&to=${selectedContact?.name || "Contact"}&txid=P2P-${Math.random().toString(36).substring(2, 11).toUpperCase()}`);
    } catch {
      toast.error("Erreur lors du transfert");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={goBack} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Envoyer P2P</h1>
          <p className="text-[9px] font-bold text-cyan-500 tracking-[3px] uppercase">
            {"Etape " + step + " / 4"}
          </p>
        </div>
        <button
          onClick={() => router.push("/mpay")}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <X size={20} />
        </button>
      </header>

      <main className="px-6 pt-6 pb-32">
        {/* STEP 1: SELECT CONTACT */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search bar */}
            <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-cyan-500/50 transition-all">
              <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="RECHERCHER PAR NOM OU @USERNAME"
                className="bg-transparent flex-1 outline-none font-bold text-xs uppercase placeholder:text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Contacts */}
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">
                {searchQuery ? `${filteredContacts.length} resultat(s)` : "Contacts recents"}
              </p>
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] active:scale-[0.98] transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20">
                      <span className="text-sm font-black text-cyan-400">{contact.avatar}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black uppercase tracking-tight">{contact.name}</p>
                      <p className="text-[10px] font-bold text-slate-500">{contact.username}</p>
                    </div>
                    {contact.lastSent && (
                      <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-3 py-1 rounded-full">
                        {contact.lastSent}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AMOUNT */}
        {step === 2 && selectedContact && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* Contact Info */}
            <div className="flex items-center gap-4 p-4 bg-cyan-600/5 border border-cyan-500/20 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20">
                <span className="text-sm font-black text-cyan-400">{selectedContact.avatar}</span>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">{selectedContact.name}</p>
                <p className="text-[10px] font-bold text-cyan-500">{selectedContact.username}</p>
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Montant a envoyer</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-black text-cyan-500">Pi</span>
                <span className="text-5xl font-black tracking-tighter">{amount || "0"}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between px-4">
                <div className="text-left">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Solde</p>
                  <p className="text-sm font-black text-emerald-400">{userBalance.toLocaleString()} Pi</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Frais</p>
                  <p className="text-sm font-black text-white">0.00 Pi</p>
                </div>
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="h-14 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                >
                  {key === "delete" ? <Delete size={20} className="text-red-500" /> : key}
                </button>
              ))}
            </div>

            <button
              onClick={handleAmountNext}
              className="w-full bg-cyan-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-cyan-600/30 active:scale-95 transition-all"
            >
              Continuer
            </button>
          </div>
        )}

        {/* STEP 3: MESSAGE (optional) */}
        {step === 3 && selectedContact && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary top */}
            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20">
                  <span className="text-[10px] font-black text-cyan-400">{selectedContact.avatar}</span>
                </div>
                <div>
                  <p className="text-xs font-black uppercase">{selectedContact.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold">{selectedContact.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{amount} <span className="text-cyan-500">Pi</span></p>
              </div>
            </div>

            {/* Message input */}
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-cyan-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message (optionnel)</p>
              </div>
              <textarea
                placeholder="Ajouter un message pour le destinataire..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none resize-none h-28 placeholder:text-slate-700 focus:border-cyan-500/50 transition-all"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
              />
              <p className="text-right text-[9px] font-bold text-slate-600 mt-2">{message.length}/200</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-white/5 border border-white/10 p-5 rounded-[2rem] font-black uppercase tracking-wider text-sm hover:bg-white/10 active:scale-95 transition-all"
              >
                Passer
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-cyan-600 p-5 rounded-[2rem] font-black uppercase tracking-wider text-sm shadow-xl shadow-cyan-600/20 active:scale-95 transition-all"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 4 && selectedContact && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck size={120} />
              </div>

              <div className="text-center mb-2">
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[3px] mb-2">Transfert P2P</p>
                <p className="text-3xl font-black">{amount} <span className="text-cyan-500">Pi</span></p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Destinataire</span>
                  <span className="font-black text-xs text-cyan-400 uppercase">{selectedContact.name}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Username</span>
                  <span className="font-black text-xs uppercase">{selectedContact.username}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Frais</span>
                  <span className="font-black text-xs text-emerald-400 uppercase">0.00 Pi</span>
                </div>
                {message && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest block mb-2">Message</span>
                    <p className="text-xs font-medium text-slate-300">{message}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="p-4 rounded-full bg-cyan-600/10 border border-cyan-500/20 text-cyan-500 animate-bounce">
                  <Fingerprint size={32} />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmer le transfert</p>
              </div>
            </div>

            <button
              onClick={handleConfirmSend}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-cyan-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              {isLoading ? "Envoi en cours..." : "Envoyer maintenant"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
