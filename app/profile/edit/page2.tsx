"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Camera, User, Mail, Phone, Lock,
  Check, Loader2, Home, Wallet, ArrowDownToLine,
  Smartphone, ArrowUpFromLine, Send, Menu, Globe, MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

// --- BOTTOM NAV ---
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
  const [fetching, setFetching] = useState(true);

  // États du formulaire avec tous les champs utilisateur
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    country: "",
    city: "",
    address: ""
  });

  // 1. Récupération des données utilisateur au montage
  useEffect(() => {
    setMounted(true);
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user) {
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            username: data.user.username || "",
            country: data.user.country || "",
            city: data.user.city || "",
            address: data.user.address || ""
          });
        }
      } catch (err) {
        toast.error("Impossible de charger les données");
      } finally {
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  // 2. Sauvegarde des modifications
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de la mise à jour");

      toast.success("Profil mis à jour !");
      router.push("/profile");
      router.refresh(); // Rafraîchit les données côté serveur
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || fetching) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-50">
        <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Modifier Profil</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="w-28 h-28 rounded-[32px] bg-gradient-to-tr from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic border-4 border-slate-900 shadow-2xl uppercase">
              {formData.firstName?.[0] || formData.username?.[0] || "P"}
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-lg">
              <Camera size={18} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-4 tracking-widest">@ {formData.username}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><User size={12} /> Prénom</label>
              <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="John" />
            </div>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">Nom</label>
              <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Doe" />
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Mail size={12} /> Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
          </div>

          <div className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl opacity-60">
            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-2"><Phone size={12} /> Téléphone</label>
            <input type="text" value={formData.phone} readOnly className="w-full bg-transparent outline-none font-bold text-sm cursor-not-allowed" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Globe size={12} /> Pays</label>
              <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Cameroun" />
            </div>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><MapPin size={12} /> Ville</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Douala" />
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">Adresse Résidentielle</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Rue 123, Akwa" />
          </div>

          <Link href="/settings/password" className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl group transition-all active:bg-blue-600/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500"><Lock size={16} /></div>
              <span className="text-sm font-bold">Modifier le mot de passe</span>
            </div>
            <Check size={16} className="text-blue-500 opacity-50" />
          </Link>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 h-16 rounded-[24px] font-black uppercase italic tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4">
            {loading ? <Loader2 className="animate-spin" /> : <>Enregistrer les modifications</>}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
