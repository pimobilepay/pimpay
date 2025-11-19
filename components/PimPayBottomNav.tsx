"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  ArrowDown,
  ArrowUp,
  Settings,
  Smartphone,
} from "lucide-react";

const PimPayBottomNav = ({ theme = "light" }) => {
  const router = useRouter();
  const pathname = usePathname();

  const isDark = theme === "dark";
  const baseColor = isDark ? "text-gray-300" : "text-gray-500";
  const activeColor = isDark ? "text-blue-400" : "text-blue-600";
  const bgColor = isDark ? "bg-[#0A0D14]" : "bg-[#F8F9FB]";
  const shadow = isDark
    ? "shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
    : "shadow-[0_-3px_12px_rgba(0,0,0,0.08)]";

  const items = [
    { id: "home", label: "Accueil", icon: <Home size={22} />, path: "/" },
    { id: "wallet", label: "Wallet", icon: <Wallet size={22} />, path: "/wallet" },
    { id: "depot", label: "Dépôt", icon: <ArrowDown size={22} />, path: "/depot" },
    { id: "retrait", label: "Retrait", icon: <ArrowUp size={22} />, path: "/retrait" },
    { id: "parametres", label: "Paramètres", icon: <Settings size={22} />, path: "/parametres" },
  ];

  // fonction navigation
  const handleSelect = (path: string) => {
    router.push(path);
  };

  const currentPath = pathname === "/" ? "home" : pathname.replace("/", "");

  return (
    <div
      className={`${bgColor} ${shadow} fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 rounded-t-2xl transition-all`}
    >
      {items.slice(0, 2).map((item) => (
        <NavItem
          key={item.id}
          item={item}
          selected={currentPath}
          onSelect={handleSelect}
          baseColor={baseColor}
          activeColor={activeColor}
        />
      ))}

      {/* Bouton central MPay */}
      <div
        onClick={() => router.push("/mpay")}
        className="flex flex-col items-center cursor-pointer"
      >
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 shadow-lg flex flex-col items-center justify-center">
          <Smartphone color="white" size={26} />
          <span className="text-white text-xs font-semibold mt-1">MPay</span>
        </div>
      </div>

      {items.slice(2).map((item) => (
        <NavItem
          key={item.id}
          item={item}
          selected={currentPath}
          onSelect={handleSelect}
          baseColor={baseColor}
          activeColor={activeColor}
        />
      ))}
    </div>
  );
};

const NavItem = ({ item, selected, onSelect, baseColor, activeColor }) => {
  const isActive = selected === item.id;
  return (
    <div
      onClick={() => onSelect(item.path)}
      className="flex flex-col items-center cursor-pointer"
    >
      <div className={`${isActive ? activeColor : baseColor}`}>
        {React.cloneElement(item.icon, {
          color: isActive ? "#007AFF" : "#A0A3AD",
        })}
      </div>
      <span
        className={`text-[11px] font-medium mt-1 ${
          isActive ? activeColor : baseColor
        }`}
      >
        {item.label}
      </span>
    </div>
  );
};

export default PimPayBottomNav;
