"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteAccountMFAModal } from "./DeleteAccountMFAModal";

export function DeleteAccountControl() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/2fa/status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enabled) setTwoFactorEnabled(true);
      })
      .catch(() => {});
  }, []);

  function proceedToMfa() {
    if (confirmation !== "SUPPRIMER") {
      toast.error("Saisissez SUPPRIMER pour confirmer.");
      return;
    }
    setOpen(false);
    setMfaOpen(true);
  }

  function handleConfirmed() {
    setMfaOpen(false);
    toast.success("Votre compte a été supprimé définitivement.");
    window.location.href = "/auth/login";
  }

  return (
    <section className="mx-6 mb-8 rounded-[28px] border border-red-500/20 bg-red-500/[0.06] p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-red-500/10 p-3 text-red-400"><AlertTriangle aria-hidden="true" size={20} /></div>
        <div><p className="text-sm font-bold text-white">Supprimer mon compte</p><p className="mt-1 text-xs leading-5 text-slate-400">Cette action est définitive. Vos données de compte ne pourront pas être récupérées.</p></div>
      </div>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20"><Trash2 aria-hidden="true" size={17} />Supprimer définitivement mon compte</button>
      {open && <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="mt-4 rounded-2xl border border-red-500/20 bg-slate-950 p-4">
        <p id="delete-account-title" className="text-sm font-bold text-white">Confirmer la suppression définitive</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">Cette action supprimera votre compte et mettra fin à votre session. Écrivez SUPPRIMER pour continuer.</p>
        <input value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} placeholder="SUPPRIMER" autoComplete="off" className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold tracking-widest text-white outline-none focus:border-red-400" />
        <div className="mt-4 flex gap-2"><button type="button" onClick={() => { setOpen(false); setConfirmation(""); }} className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-xs font-bold text-slate-300">Annuler</button><button type="button" onClick={proceedToMfa} className="flex-1 rounded-xl bg-red-600 px-3 py-3 text-xs font-bold text-white">Continuer</button></div>
      </div>}

      <DeleteAccountMFAModal
        isOpen={mfaOpen}
        onClose={() => setMfaOpen(false)}
        onConfirmed={handleConfirmed}
        twoFactorEnabled={twoFactorEnabled}
      />
    </section>
  );
}
