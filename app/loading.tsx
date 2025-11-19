"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = localStorage.getItem("pimpay_user");

      if (user) {
        router.push("/");
      } else {
        router.push("/login");
      }
    }, 12500); // 3.5s (plus professionnel)

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="
        h-screen w-full flex flex-col items-center justify-center
        bg-soft dark:bg-darkBg transition-all duration-500
      "
    >

      {/* CERCLE DE CHARGEMENT RÉDUIT */}
      <div
        className="
          w-14 h-14 rounded-full border-4 
          border-gray-300 dark:border-gray-700
          border-t-primary dark:border-t-gold
          animate-spin
        "
      />

      {/* Aucun texte (comme demandé) */}
    </div>
  );
}
