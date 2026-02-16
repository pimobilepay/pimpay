"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine } from "lucide-react";

export function QRScanner({ onClose }: { onClose: (data: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasPermission(true);
      } catch {
        if (!cancelled) setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose("");
  };

  // Simulate a QR scan detection for demo purposes
  // In production, integrate a WASM-based QR decoder like `jsQR`
  const handleSimulateScan = () => {
    setScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // Return a demo merchant code
    setTimeout(() => {
      onClose("MPAY-MERCHANT-001");
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 rounded-[32px] p-6 border border-white/10 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        <h2 className="text-lg font-black uppercase italic text-center mb-5 text-white">
          Scanner un QR Code
        </h2>

        {/* Camera viewport */}
        <div className="overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-black relative aspect-square">
          {hasPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <Camera size={48} className="text-slate-600" />
              <p className="text-slate-400 text-xs text-center uppercase tracking-wider font-bold">
                Acces camera refuse
              </p>
              <p className="text-slate-500 text-[10px] text-center">
                Autorisez l&apos;acces a la camera dans les parametres de votre navigateur
              </p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Scanning overlay */}
          {scanning && hasPermission && (
            <>
              <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br" />
                {/* Scan line animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500/80 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </>
          )}

          {!scanning && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                <ScanLine size={32} className="text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Active indicator */}
        <div className="flex items-center justify-center gap-2 mt-5 text-blue-500 animate-pulse">
          <Camera size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Capteur Securise Actif
          </span>
        </div>

        {/* Demo scan button */}
        {hasPermission !== false && scanning && (
          <button
            onClick={handleSimulateScan}
            className="w-full mt-4 py-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider hover:bg-blue-600/30 transition-colors"
          >
            Simuler un scan (Demo)
          </button>
        )}

        <p className="text-center text-slate-500 text-[8px] uppercase tracking-widest mt-4 px-4">
          Alignez le QR code dans le cadre pour valider la transaction
        </p>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
      `}</style>
    </div>
  );
}
