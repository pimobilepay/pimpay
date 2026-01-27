"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Clock, User,
  ChevronRight, Inbox, ShieldAlert,
  LayoutGrid, MessageSquare, CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const router = useRouter();
  
  // État initial structuré pour éviter les erreurs de rendu
  const [data, setData] = useState({ 
    tickets: [], 
    statistics: { total: 0, open: 0, inProgress: 0, closed: 0 } 
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Correction Hydratation : On s'assure que le composant est monté
  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch (err) {
      toast.error("Erreur protocole PimPay : Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  // Ne rien rendre tant que le client n'est pas prêt (évite l'erreur removeChild)
  if (!mounted) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-20 font-sans selection:bg-blue-500/30">
      
      {/* Header Admin */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">PimPay Command Center</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Console Administrateur</p>
          </div>
        </div>
      </div>

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
          data.tickets.map((ticket: any) => (
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
                      {ticket.user?.username || ticket.user?.name || "Client Externe"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                      ID-{ticket.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                    ticket.status === 'OPEN' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
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
                  {ticket.messages[0]?.content.split('\n\nMessage: ')[1] || ticket.messages[0]?.content}
                </p>
              </div>

              <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ouvrir le dossier</span>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-white" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Security Footer */}
      <div className="mt-12 flex flex-col items-center gap-3 opacity-20">
        <ShieldAlert size={16} />
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-center">
          PimPay Encryption • Terminal Admin v2.6.0
        </p>
      </div>
    </div>
  );
}
