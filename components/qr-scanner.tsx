"use client";

import { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Camera } from "lucide-react";

// On utilise un export NOMMÉ (export function)
export function QRScanner({ onClose }: { onClose: (data: string) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (text) => {
        scanner.clear();
        onClose(text);
      },
      (error) => {
        // scan error
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 rounded-[32px] p-8 border border-white/10 relative">
        <button onClick={() => onClose("")} className="absolute top-4 right-4 p-2 text-slate-400">
          <X size={24} />
        </button>
        <h2 className="text-xl font-black uppercase italic text-center mb-6">Scanner un QR Code</h2>
        <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-500/30"></div>
        <div className="flex items-center justify-center gap-2 mt-6 text-blue-500 animate-pulse">
          <Camera size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Caméra Active</span>
        </div>
      </div>
    </div>
  );
}
