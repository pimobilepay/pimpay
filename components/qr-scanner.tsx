"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { X, Camera } from "lucide-react";

export function QRScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        // Redirection vers la page de transfert avec l'ID scanné
        router.push(`/dashboard/send?to=${encodeURIComponent(decodedText)}`);
        onClose();
      },
      (error) => {
        // Erreurs silencieuses pendant le scan
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Scanner cleanup failed", err));
    };
  }, [router, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6">
      <button onClick={onClose} className="absolute top-10 right-6 text-white p-2 bg-white/10 rounded-full">
        <X size={24} />
      </button>

      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <Camera className="mx-auto text-blue-500" size={32} />
          <h2 className="text-2xl font-black uppercase italic italic tracking-tighter text-white">Scanner le Code</h2>
          <p className="text-xs text-slate-400">Placez le QR code d'un Pioneer dans le cadre</p>
        </div>

        <div id="reader" className="overflow-hidden rounded-3xl border-2 border-blue-500/50 shadow-2xl shadow-blue-500/20"></div>

        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          La détection est automatique et instantanée
        </p>
      </div>
    </div>
  );
}
