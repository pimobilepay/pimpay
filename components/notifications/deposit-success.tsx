import { CheckCircle2, Wallet } from "lucide-react";

export const showDepositNotification = (amount: number, reference: string) => {
  return (
    <div className="flex items-center gap-4 p-2">
      <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30 shrink-0">
        <CheckCircle2 className="text-green-500" size={24} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dépôt Confirmé</span>
        <span className="text-sm font-bold text-white">
          +${amount.toFixed(2)} ajoutés à votre compte
        </span>
        <span className="text-[9px] font-mono text-slate-500 mt-0.5">Réf: {reference}</span>
      </div>
    </div>
  );
};

