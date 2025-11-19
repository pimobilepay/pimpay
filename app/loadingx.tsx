"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = localStorage.getItem("pimpay_user");

      if (user) {
        router.push("/"); // page d’accueil
      } else {
        router.push("/login"); // page de connexion
      }
    }, 12000); // 12 secondes

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen w-full flex flex-col justify-between items-center bg-gradient-to-br from-[#0a0a0f] to-[#1b1b29] text-white font-[Poppins] overflow-hidden">
      <div className="mt-[40vh] w-20 h-20 border-4 border-white/20 border-t-[#00bfff] rounded-full animate-spin"></div>

      <div className="mt-10 text-sm text-[#b0c4de] tracking-wide opacity-80">
        Chargement...
      </div>

      <div className="flex items-center justify-center gap-2 mb-10 text-lg font-bold">
        <div className="bg-white text-[#1b1b29] font-extrabold rounded-lg px-2 py-[2px] text-sm">
          Pi
        </div>
        <span className="opacity-90">Mobile Pay</span>
      </div>
    </div>
  );
}
