"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useState } from "react";
import SideMenu from "./SideMenu";

export default function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="
          fixed top-0 left-0 right-0 h-20 z-40
          flex items-center justify-between px-6

          bg-white/70 dark:bg-[#0C0E13]/60
          backdrop-blur-xl border-b border-white/20 dark:border-white/10

          shadow-[0_4px_15px_rgba(0,0,0,0.1)]
          dark:shadow-[0_4px_25px_rgba(0,0,0,0.45)]

          animate-fadeIn
        "
      >
        {/* 🚀 LOGO PIMPAY (agrandi + lisible) */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-pimpay.png"
            alt="PIMPAY Logo"
            width={70}     // ⬅️ augmenté pour meilleure lisibilité
            height={70}
            className="
              drop-shadow-[0_0_14px_rgba(255,150,0,0.45)]
              dark:drop-shadow-[0_0_18px_rgba(255,200,90,0.7)]
              rounded-xl
            "
            priority
          />
        </div>

        {/* ☰ MENU BUTTON */}
        <button
          onClick={() => setOpen(true)}
          className="
            p-2 bg-white/60 dark:bg-white/10 
            hover:scale-110 transition shadow
          "
        >
          <Menu size={30} className="text-gray-800 dark:text-white" />
        </button>
      </div>

      <SideMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
