"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  Camera, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Check, 
  Loader2,
  Home,
  Wallet,
  ArrowDownToLine,
  Smartphone,
  ArrowUpFromLine,
  Send,
  Menu
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

// --- BOTTOM NAV IDENTIQUE ---
function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Dépôt" },
    { href: "/mpay", icon: Smartphone, label: "MPay", special: true },
    { href: "/withdraw", icon: ArrowUpFromLine, label: "Retrait" },
    { href: "/transfer", icon: Send, label: "Envoi" },
    { href: "#", icon: Menu, label: "Menu" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 h-20 flex justify-around items-center px-1">
      {navItems.map((item, idx) => (
        <Link key={idx} href={item.href} className="flex flex-col items-center">
          <item.icon size={20} className={pathname === item.href ? "text-blue-500" : "text-slate-500"} />
          <span className={`text-[9px] uppercase font-bold mt-1 ${pathname === item.href ? "text-blue-500" : "text-slate-500"}`}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // États du formulaire
  const [formData, setFormData] = useState({
    fullName: "Pi Pioneer",
    email: "pioneer@pi.network",
    phone: "+237 677 00 00 00",
    username: "pi_pioneer_237"
  });

  useEffect(() => { setMounted(true); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulation d'appel API
    setTimeout(() => {
      setLoading(false);
      toast.success("Profil mis à jour avec succès !");
      router.push("/profile");
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* HEADER AVEC BOUTON RETOUR */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-50">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Modifier Profil</h1>
        <div className="w-10"></div> {/* Spacer pour centrer le titre */}
      </header>

      <main className="px-6">
        {/* AVATAR EDIT SECTION */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="w-28 h-28 rounded-[32px] bg-gradient-to-tr from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic border-4 border-slate-900 shadow-2xl">
              P
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-lg group-active:scale-90 transition-transform">
              <Camera size={18} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-4 tracking-widest">Changer la photo</p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            {/* Champ Nom */}
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                <User size={12} /> Nom Complet
              </label>
              <input 
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-transparent outline-none font-bold text-sm"
              />
            </div>

            {/* Champ Username */}
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                @ Username
              </label>
              <input 
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full bg-transparent outline-none font-bold text-sm text-blue-400"
              />
            </div>

            {/* Champ Email */}
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                <Mail size={12} /> Email
              </label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-transparent outline-none font-bold text-sm"
              />
            </div>

            {/* Champ Téléphone (Désactivé car lié au compte) */}
            <div className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl opacity-60">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-2">
                <Phone size={12} /> Téléphone (Non modifiable)
              </label>
              <input 
                type="text" 
                value={formData.phone}
                readOnly
                className="w-full bg-transparent outline-none font-bold text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* LIEN CHANGEMENT PIN */}
          <Link 
            href="/profile/change-pin"
            className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                <Lock size={16} />
              </div>
              <span className="text-sm font-bold">Sécurité du Code PIN</span>
            </div>
            <Check size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* BOUTON SAUVEGARDER */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 h-16 rounded-[24px] font-black uppercase italic tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>Sauvegarder les modifications</>
            )}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
