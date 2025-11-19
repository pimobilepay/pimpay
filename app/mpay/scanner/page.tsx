"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

// ⚠ IMPORTANT : si tu souhaites utiliser une vraie lib QR 
// installer : npm install react-qr-scanner
// puis importer :
/*
import QrScanner from "react-qr-scanner";
*/

export default function ScannerPage() {
  const router = useRouter();
  const [permission, setPermission] = useState(true);

  useEffect(() => {
    // Vérification permission caméra
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setPermission(true))
      .catch(() => setPermission(false));
  }, []);

  return (
    <div className="p-6 pb-10">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">Scanner un QR</h1>
      </div>

      {/* SI AUCUNE PERMISSION CAMERA */}
      {!permission && (
        <div className="text-center text-red-500 font-semibold">
          ⚠ Autorisation caméra refusée.
          <br /> Active la caméra pour scanner un QR Code.
        </div>
      )}

      {/* ZONE DE SCAN */}
      <div className="relative w-full mt-6 flex justify-center">
        <div
          className="
            w-80 h-80 rounded-3xl overflow-hidden
            bg-black/20 backdrop-blur-xl
            border border-white/20 dark:border-white/10
            shadow-[0_5px_20px_rgba(0,0,0,0.35)]
            relative
          "
        >
          {/* CAMERA FAUSSE PREVIEW (remplacer par vraie caméra ensuite) */}
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <QrCode size={90} className="text-white/30" />
          </div>

          {/* ANIMATION CADRE */}
          <div
            className="
              absolute inset-0 border-[3px] 
              border-blue-500/60 dark:border-blue-300/60
              rounded-3xl animate-pulse
            "
          ></div>

          {/* FONDU RADIAL */}
          <div
            className="
              absolute inset-0
              bg-radial from-transparent via-transparent to-black/50
            "
          ></div>
        </div>
      </div>

      {/* TEXTE */}
      <p className="text-center mt-6 text-foreground/70">
        Place le code QR dans le cadre pour scanner automatiquement
      </p>
    </div>
  );
}
