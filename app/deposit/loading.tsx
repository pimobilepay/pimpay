import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
      </div>
      <p className="mt-6 text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] animate-pulse">
        PIMPAY Network Syncing...
      </p>
    </div>
  );
}
