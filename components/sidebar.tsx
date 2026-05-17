"use client";

import React from 'react';
import { X, LayoutDashboard, Wallet, Settings, Shield, LogOut, Bell, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Utilise "export const" pour que { Sidebar } fonctionne
export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();

  if (!isOpen) return null;

  const menuItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Portefeuille', icon: Wallet, path: '/wallet' },
    { name: 'PIM Coins', icon: Coins, path: '/pim-coins', highlight: true },
    { name: 'Sécurité', icon: Shield, path: '/settings/security' },
    { name: 'Paramètres', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Overlay sombre */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Menu Drawer */}
      <aside className="relative w-80 h-full bg-[#020617] border-r border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-black italic text-blue-500">PIMPAY</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* SECTION NOTIFICATIONS AJOUTÉE */}
        <div className="mb-6">
          <button
            onClick={() => {
              router.push('/notifications');
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-blue-400 transition-all border border-white/5"
          >
            <div className="flex items-center gap-4">
              <Bell size={20} />
              <span className="font-bold uppercase text-xs tracking-widest">Notifications</span>
            </div>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path);
                onClose();
              }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold uppercase text-xs tracking-widest ${
                item.highlight 
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30' 
                  : 'text-slate-400 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.name}
              {item.highlight && (
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-500 text-black rounded-full font-black">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <button className="flex items-center gap-4 px-4 py-4 text-rose-500 font-bold uppercase text-xs tracking-widest mt-auto border-t border-white/5">
          <LogOut size={20} />
          Déconnexion
        </button>
      </aside>
    </div>
  );
};
