"use client";
import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, RefreshCcw, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DebugPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("Vérification de la session...");
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        console.log("Data reçue de auth/me:", data);

        // Correction ici : On vérifie plusieurs structures possibles de l'ID
        const userId = data.id || data.user?.id || data._id;
        const userName = data.name || data.user?.name || data.username || "Utilisateur";

        if (userId) {
          setUser({ id: userId, name: userName });
          toast.success(`Connecté en tant que ${userName}`);
        } else {
          console.error("Structure ID non trouvée dans:", data);
          toast.error("ID utilisateur introuvable dans la session");
        }
      } catch (err) {
        console.error("Erreur fetch auth/me:", err);
        toast.error("Erreur de connexion à l'API Auth");
      } finally {
        setIsChecking(false);
      }
    }
    checkAuth();
  }, []);

  const runSimulation = async (type: "DEPOSIT" | "WITHDRAW") => {
    // Si le bouton ne réagit pas, c'est que user?.id est null
    if (!user?.id) {
      toast.error("Action impossible : Aucun ID utilisateur détecté");
      return;
    }

    setLoading(type);
    const amount = type === "DEPOSIT" ? 100 : 50;

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: amount,
          type: type
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(type === "DEPOSIT" ? "+100$ ajoutés !" : "Retrait réussi !");
      } else {
        toast.error(data.error || "Erreur simulation");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  if (isChecking) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <RefreshCcw className="animate-spin text-blue-500" size={32} />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Initialisation du Lab...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        
        {/* Info Session */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${user ? 'bg-blue-600' : 'bg-red-600'}`}>
              <UserIcon size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase">Utilisateur Actif</p>
              <h2 className="text-sm font-bold truncate">{user?.name || "Non identifié"}</h2>
              <p className="text-[9px] font-mono text-blue-400 truncate">{user?.id || "ID MANQUANT"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => runSimulation("DEPOSIT")}
            disabled={!!loading || !user}
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[2rem] flex justify-between items-center active:scale-95 disabled:opacity-20 transition-all"
          >
            <div className="text-left">
              <span className="text-emerald-500 font-black text-[10px] uppercase block">Simulation</span>
              <h3 className="text-xl font-black italic">+100.00 USD</h3>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-2xl">
              {loading === "DEPOSIT" ? <RefreshCcw className="animate-spin size-5 text-emerald-500" /> : <ArrowDownLeft className="text-emerald-500" />}
            </div>
          </button>

          <button
            onClick={() => runSimulation("WITHDRAW")}
            disabled={!!loading || !user}
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[2rem] flex justify-between items-center active:scale-95 disabled:opacity-20 transition-all"
          >
            <div className="text-left">
              <span className="text-red-500 font-black text-[10px] uppercase block">Simulation</span>
              <h3 className="text-xl font-black italic">-50.00 USD</h3>
            </div>
            <div className="bg-red-500/10 p-4 rounded-2xl">
              {loading === "WITHDRAW" ? <RefreshCcw className="animate-spin size-5 text-red-500" /> : <ArrowUpRight className="text-red-500" />}
            </div>
          </button>
        </div>

        <div className="mt-10 p-6 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] flex items-start gap-3">
          <ShieldCheck className="text-blue-500 mt-1" size={16} />
          <p className="text-[11px] text-slate-500 italic leading-relaxed">
            Si les boutons restent bloqués, vérifie dans la console de ton navigateur si l'API <code className="text-blue-400">auth/me</code> renvoie bien un objet avec un champ <code className="text-white">id</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
