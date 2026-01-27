"use client";

import { X, Camera } from "lucide-react";
// @ts-ignore
import { BarcodeScanner } from "react-qr-barcode-scanner"; 

// On garde l'export NOMMÉ comme dans ton fichier original
export function QRScanner({ onClose }: { onClose: (data: string) => void }) {

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 rounded-[32px] p-8 border border-white/10 relative">
        {/* Bouton Fermer */}
        <button
          onClick={() => onClose("")}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-black uppercase italic text-center mb-6">Scanner un QR Code</h2>

        {/* Zone du Scanner */}
        <div className="overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-black relative aspect-square">
          <BarcodeScanner
            width="100%"
            height="100%"
            onUpdate={(err: any, result: any) => {
              if (result) {
                // Dès qu'un code est détecté, on renvoie la donnée et on ferme
                onClose(result.getText());
              }
            }}
          />

          {/* Overlay de visée décoratif */}
          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-500/50 rounded-lg pointer-events-none"></div>
        </div>

        {/* Indicateur d'activité */}
        <div className="flex items-center justify-center gap-2 mt-6 text-blue-500 animate-pulse">
          <Camera size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Capteur Sécurisé Actif</span>
        </div>

        <p className="text-center text-slate-500 text-[8px] uppercase tracking-widest mt-4 px-6">
          Alignez le QR code dans le cadre pour valider la transaction
        </p>
      </div>
    </div>
  );
}
