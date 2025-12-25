"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Scan,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // États du formulaire
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);

  // États visuels
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("pimpay_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Récupération du solde depuis l'objet utilisateur (mis à jour par /api/user/profile)
      setBalance(parsedUser.balance || 0);
    }

    const addr = searchParams.get("address");
    if (addr) setRecipientId(addr);
  }, [searchParams]);

  // Rechercher l'utilisateur destinataire
  useEffect(() => {
    const searchUser = async () => {
      if (recipientId.length >= 3) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/user/search?query=${encodeURIComponent(recipientId)}`);
          const data = await res.json();
          if (res.ok) {
            setRecipientData(data);
          } else {
            setRecipientData(null);
          }
        } catch (err) {
          setRecipientData(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setRecipientData(null);
      }
    };
    const timer = setTimeout(searchUser, 500);
    return () => clearTimeout(timer);
  }, [recipientId]);

  const handleSend = async () => {
    // CRUCIAL : Utiliser l'ID unique de la DB trouvé via la recherche
    const finalRecipientId = recipientData?.id || recipientId;

    if (!finalRecipientId || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount > balance) {
      toast.error("Solde insuffisant");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Session expirée, veuillez vous reconnecter");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          recipientId: finalRecipientId,
          amount: numericAmount,
          description: description,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Transfert réussi !");

        // Mise à jour du solde local immédiate
        const newBalance = balance - numericAmount;
        const updatedUser = { ...user, balance: newBalance };
        localStorage.setItem("pimpay_user", JSON.stringify(updatedUser));
        setBalance(newBalance);

        // Redirection vers le dashboard pour rafraîchir les données
        router.push("/dashboard");
      } else {
        // Gestion de l'erreur de token corrompu
        if (result.error?.includes("JWS") || result.error?.includes("JWT") || response.status === 401) {
          toast.error("Erreur de session. Reconnexion...");
          localStorage.removeItem("token");
          router.push("/auth/login");
        } else {
          toast.error(result.error || "Échec du transfert");
        }
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 bg-slate-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Envoyer des Pi</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Destinataire</label>
          <div className="relative">
            <input
              type="text"
              placeholder="ID Utilisateur, Email ou @username"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 pl-12 text-sm focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-4 top-4 text-slate-500" size={18} />
            <button
              onClick={() => setIsScanning(true)}
              className="absolute right-4 top-3 p-2 bg-blue-600 rounded-xl"
            >
              <Scan size={18} />
            </button>
          </div>

          {isSearching && <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase p-2"><Loader2 className="animate-spin" size={12}/> Recherche...</div>}
          {recipientData && (
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">
                {recipientData.name?.charAt(0) || "P"}
              </div>
              <div>
                <p className="text-xs font-bold">{recipientData.name || recipientData.firstName}</p>
                <p className="text-[10px] text-blue-400 uppercase font-black">Utilisateur Trouvé</p>
              </div>
              <CheckCircle2 className="ml-auto text-blue-500" size={16} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Montant (π)</label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-3xl p-6 text-3xl font-black outline-none focus:border-blue-500 transition-all text-center"
            />
            <span className="absolute right-6 top-7 text-blue-500 font-black italic">PI</span>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-600 uppercase">Disponible: π {balance.toFixed(4)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Note (Optionnel)</label>
          <input
            type="text"
            placeholder="Ex: Remboursement dîner"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-sm outline-none"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={isLoading || !recipientId || !amount}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <span className="font-black uppercase tracking-tighter">Confirmer l'envoi</span>
              <Send size={18} />
            </>
          )}
        </button>
      </div>

      {isScanning && (
        <QRScanner
          onClose={(val) => {
            if (val) setRecipientId(val);
            setIsScanning(false);
          }}
        />
      )}
    </div>
  );
}
