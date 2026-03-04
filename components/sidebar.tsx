"use client";

import React from 'react';
import { X, LayoutDashboard, Wallet, Settings, Shield, LogOut, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Security', icon: Shield, path: '/settings/security' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Dark overlay */}
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-opacity ${isDark ? "bg-black/60" : "bg-black/30"}`}
        onClick={onClose}
      />

      {/* Menu Drawer */}
      <aside className={`relative w-80 h-full border-r p-6 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 ${isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-black italic text-blue-500">PIMPAY</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={24} />
          </button>
        </div>

        {/* NOTIFICATIONS SECTION */}
        <div className="mb-6">
          <button
            onClick={() => {
              router.push('/settings/notifications');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all border ${isDark ? "bg-white/5 text-slate-400 hover:text-blue-400 border-white/5" : "bg-slate-50 text-slate-500 hover:text-blue-500 border-slate-200"}`}
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
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold uppercase text-xs tracking-widest ${isDark ? "text-slate-400 hover:bg-blue-600 hover:text-white" : "text-slate-500 hover:bg-blue-500 hover:text-white"}`}
            >
              <item.icon size={20} />
              {item.name}
            </button>
          ))}
        </nav>

        <button className={`flex items-center gap-4 px-4 py-4 text-rose-500 font-bold uppercase text-xs tracking-widest mt-auto border-t ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <LogOut size={20} />
          Logout
        </button>
      </aside>
    </div>
  );
};
