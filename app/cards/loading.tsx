import { Loader2 } from "lucide-react";

export default function CardsLoading() {
  return (
    <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
          Chargement de la carte...
        </p>
      </div>
    </div>
  );
}
