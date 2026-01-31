"use client";

import { useState, useEffect } from "react";
import { 
  ArrowUpRight, ArrowDownLeft, Filter, 
  Search, MoreVertical, CheckCircle2, 
  Clock, XCircle, ShieldAlert, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function TransactionMonitor() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation de flux en temps réel
  useEffect(() => {
    const fetchTransactions = async () => {
      // Ici: const res = await fetch('/api/admin/transactions')
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl shadow-2xl">
      {/* HEADER DU MONITEUR */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-wider">Live Traffic</h3>
            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">Flux de devises en direct</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              placeholder="ID Transaction..." 
              className="bg-[#020617] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[11px] outline-none focus:border-blue-500/50 w-full"
            />
          </div>
          <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
            <Filter size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* TABLEAU DES TRANSACTIONS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.01] border-b border-white/5">
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Utilisateur</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Type / Devise</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Montant</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Statut</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5].map((item, idx) => (
              <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                      {idx === 0 ? "AA" : "MK"}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{idx === 0 ? "Abdoulaye Ankh" : "Moussa Koné"}</p>
                      <p className="text-[9px] text-slate-500 font-medium tracking-tighter">ID: TXN-992834{item}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {idx % 2 === 0 ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <ArrowDownLeft size={10} />
                        <span className="text-[9px] font-black uppercase">Dépôt</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <ArrowUpRight size={10} />
                        <span className="text-[9px] font-black uppercase">Retrait</span>
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 italic">{idx % 3 === 0 ? "PI" : "XAF"}</span>
                  </div>
                </td>
                <td className="p-4">
                  <p className={`text-xs font-black ${idx % 2 === 0 ? 'text-white' : 'text-slate-300'}`}>
                    {idx % 2 === 0 ? '+' : '-'} {idx % 3 === 0 ? '314.15' : '15,000.00'}
                  </p>
                </td>
                <td className="p-4">
                  <StatusBadge status={idx === 2 ? "PENDING" : "SUCCESS"} />
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-500 hover:text-white transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER - ALERTE SÉCURITÉ */}
      <div className="p-4 bg-rose-500/5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-500 animate-pulse" />
          <p className="text-[9px] font-black uppercase text-rose-500/80 tracking-widest italic">Aucune anomalie détectée • Scan AI actif</p>
        </div>
        <button className="text-[9px] font-black uppercase text-slate-500 hover:text-blue-400 transition-all">
          Exporter CSV
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    SUCCESS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    FAILED: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  };

  return (
    <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter inline-flex items-center gap-1 ${styles[status]}`}>
      {status === "SUCCESS" && <CheckCircle2 size={8} />}
      {status === "PENDING" && <Clock size={8} />}
      {status === "FAILED" && <XCircle size={8} />}
      {status}
    </div>
  );
}
