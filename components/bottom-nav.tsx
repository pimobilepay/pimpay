"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, ArrowDown, ArrowUp, Send, Smartphone } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  /* 🎨 COULEURS */
  const textColor = isDark ? "text-[#9BB4D1]" : "text-[#6D7A90]";
  const activeColor = isDark ? "text-blue-300" : "text-blue-600";
  const bgColor = isDark ? "bg-[#06080C]/80" : "bg-white/80";

  const cardShadow = isDark
    ? "shadow-[0_0_25px_rgba(0,0,0,0.8)]"
    : "shadow-[0_0_20px_rgba(0,0,0,0.12)]";

  /* 📌 ITEMS — Paramètres supprimé */
  const items = [
    { id: "home", label: "Accueil", icon: Home, path: "/" },
    { id: "depot", label: "Dépôt", icon: ArrowDown, path: "/deposit" },
    { id: "mpay", label: "MPay", icon: Smartphone, path: "/mpay" },
    { id: "retrait", label: "Retrait", icon: ArrowUp, path: "/withdraw" },
    { id: "transfert", label: "Transfert", icon: Send, path: "/transfer" },
  ];

  const currentPath = pathname === "/" ? "home" : pathname.replace("/", "");

  return (
    <div className="w-full fixed bottom-4 left-0 right-0 z-50 flex justify-center">
      <div
        className={`
          ${bgColor} ${cardShadow}
          w-[92%] max-w-[430px]
          py-4 rounded-3xl
          flex items-center justify-between px-6
          border border-white/10 dark:border-white/5 
          backdrop-blur-2xl
        `}
      >
        {items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            selected={currentPath}
            textColor={textColor}
            activeColor={activeColor}
            onSelect={(p) => router.push(p)}
            isActive={currentPath === item.id}
          />
        ))}
      </div>
    </div>
  );
}

/* 🔧 COMPONENT NAV ITEM */
const NavItem = ({
  item,
  onSelect,
  selected,
  textColor,
  activeColor,
  isActive,
}) => {
  const Icon = item.icon;

  return (
    <div
      onClick={() => onSelect(item.path)}
      className="flex flex-col items-center cursor-pointer w-14"
    >
      <Icon size={24} className={isActive ? activeColor : textColor} />

      <span
        className={`text-[12px] mt-1 font-medium ${
          isActive ? activeColor : textColor
        }`}
      >
        {item.label}
      </span>
    </div>
  );
};
