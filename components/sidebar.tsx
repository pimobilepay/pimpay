"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, ArrowUpRight, ArrowDownLeft, Settings, LogOut, UserCheck } from 'lucide-react';
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Envoyer', icon: ArrowUpRight, path: '/transfer' },
    { name: 'Paramètres', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col h-full w-64 bg-slate-900 text-white border-r border-slate-800 fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-black text-blue-500 italic">PIMPAY</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={cn(
              "flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all",
              pathname === item.path ? "bg-blue-600 shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <item.icon size={20} />
            <span className="font-bold text-sm uppercase tracking-tight">{item.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
