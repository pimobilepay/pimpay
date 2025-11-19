"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Copy, Share2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

export default function MPayReceivePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("user-pimpay-001");

  // Copier l’ID
  const copyId = () => {
    navigator.clipboard.writeText(userId);
  };

  // Partager QR Code
  const shareQR = async () => {
    try {
      await navigator.share({
        title: "Mon QR PIMPAY",
        text: "Voici mon QR pour recevoir un paiement sur MPay",
        url: window.location.href,
      });
    } catch (e) {
      console.log("Partage non supporté", e);
    }
  };

  return (
    <div className="p-6 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-lg"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">Recevoir un paiement</h1>
      </div>

      {/* DESCRIPTION */}
      <p className="text-center text-muted-foreground mb-4">
        Montrez ce QR Code à la personne qui vous envoie un paiement.
      </p>

      {/* ZONE QR CODE */}
      <div className="flex justify-center mt-5 mb-5">

        <div
          className="
            p-6 rounded-3xl bg-white/10 dark:bg-white/5
            border border-white/20 dark:border-white/10
            shadow-[0_8px_25px_rgba(0,0,0,0.25)]
            backdrop-blur-xl
            relative
          "
        >
          {/* CADRE ANIMÉ */}
          <div
            className="
              absolute inset-0 rounded-3xl border-[3px]
              border-blue-500/70 dark:border-blue-300/50
              animate-pulse pointer-events-none
            "
          ></div>

          {/* QR CODE */}
          <div className="bg-white p-3 rounded-xl shadow-inner">
            <QRCode
              value={userId}
              size={220}
              bgColor="#FFFFFF"
              fgColor="#000000"
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* USER ID */}
      <div
        className="
          mt-6 p-4 rounded-xl
          bg-white/10 dark:bg-white/5 backdrop-blur-xl
          border border-white/20 dark:border-white/10
          flex items-center justify-between
        "
      >
        <div>
          <p className="text-sm text-muted-foreground">Votre ID PIMPAY</p>
          <p className="text-lg font-semibold text-foreground">{userId}</p>
        </div>

        <button
          onClick={copyId}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
        >
          <Copy className="text-foreground" size={20} />
        </button>
      </div>

      {/* BOUTON PARTAGER */}
      <button
        onClick={shareQR}
        className="
          w-full mt-8 py-4 rounded-xl text-lg font-semibold
          bg-gradient-to-br from-blue-500 to-blue-300
          text-white shadow-lg active:scale-95
          flex items-center justify-center gap-3
        "
      >
        <Share2 size={22} /> Partager mon QR
      </button>
    </div>
  );
}
