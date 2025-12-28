"use client";

import React, { useState } from 'react';
import { Settings2, Clock, Power, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const MaintenanceControl = ({ currentConfig }: { currentConfig: any }) => {
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  const handleToggleMaintenance = async (mode: boolean, until?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode: mode,
          maintenanceUntil: until || null
        }),
      });

      if (res.ok) {
        toast.success(mode ? "Maintenance activée" : "Système en ligne");
        window.location.reload(); // Recharge pour synchroniser les cookies
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
          <Settings2 size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Contrôle Maintenance</h3>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Protocol v3.5</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date de planification */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Planifier la fin</label>
          <input 
            type="datetime-local" 
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Bouton Activer / Planifier */}
          <button
            onClick={() => handleToggleMaintenance(true, scheduledDate)}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-[11px] font-bold py-3 rounded-xl transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Clock size={14} />}
            {scheduledDate ? "PLANIFIER" : "ACTIVER"}
          </button>

          {/* Bouton Stopper */}
          <button
            onClick={() => handleToggleMaintenance(false)}
            disabled={loading || !currentConfig?.maintenanceMode}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white text-[11px] font-bold py-3 rounded-xl transition-all border border-white/10"
          >
            <Power size={14} className="text-emerald-500" />
            STOPPER
          </button>
        </div>
      </div>
    </div>
  );
};
