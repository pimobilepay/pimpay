"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, Camera, User, Mail, Phone, Lock,
  Check, Loader2, Home, Wallet, ArrowDownToLine,
  Smartphone, ArrowUpFromLine, Send, Menu, Globe, MapPin,
  Calendar, Fingerprint, Landmark
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    birthDate: "",
    nationality: "",
    country: "",
    city: "",
    address: "",
    walletAddress: "",
    avatar: "",
  });

  useEffect(() => {
    setMounted(true);
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user) {
          setFormData({
            id: data.user.id || "",
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            username: data.user.username || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            birthDate: data.user.birthDate ? data.user.birthDate.split('T')[0] : "",
            nationality: data.user.nationality || "",
            country: data.user.country || "",
            city: data.user.city || "",
            address: data.user.address || "",
            walletAddress: data.user.walletAddress || "",
            avatar: data.user.avatar || "",
          });
        }
      } catch (err) {
        toast.error("Erreur de chargement");
      } finally {
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("avatar", file);
    uploadData.append("userId", formData.id);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");

      setFormData(prev => ({ ...prev, avatar: data.avatar }));
      toast.success("Avatar mis à jour !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Erreur de mise à jour");
      toast.success("Profil complet mis à jour !");
      router.push("/profile");
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
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-50">
        <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Édition Profil</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6">
        {/* AVATAR HEADER - MODIFIÉ EN CERCLE */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            {/* Remplacement de rounded-[32px] par rounded-full */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic border-4 border-slate-900 shadow-2xl uppercase overflow-hidden">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                formData.username?.[0] || "P"
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            {/* Adaptation du bouton pour suivre la forme circulaire */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={18} />
            </button>
          </div>
          <p className="text-[10px] text-blue-500 font-black uppercase mt-4 tracking-[3px]">Member Verified</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identité Personnelle</h3>

            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Fingerprint size={12} /> Nom d'utilisateur (Public)</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm text-blue-400" placeholder="pi_master" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Prénom</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
              </div>
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Nom</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Calendar size={12} /> Naissance</label>
                <input type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm text-slate-300 [color-scheme:dark]" />
              </div>
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Globe size={12} /> Nationalité</label>
                <input type="text" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Ex: Camerounais" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contact & Web3</h3>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Mail size={12} /> Email de secours</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
            </div>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Landmark size={12} /> Pi Wallet Address</label>
              <input type="text" value={formData.walletAddress} onChange={(e) => setFormData({...formData, walletAddress: e.target.value})} className="w-full bg-transparent outline-none font-mono text-[11px] text-amber-500 overflow-ellipsis" placeholder="GD3A..." />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Localisation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Pays</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
              </div>
              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Ville</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" />
              </div>
            </div>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><MapPin size={12} /> Adresse de résidence</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-transparent outline-none font-bold text-sm" placeholder="Rue, Quartier, Porte" />
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <Link href="/settings/password" className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500"><Lock size={16} /></div>
                <span className="text-sm font-bold">Modifier le mot de passe</span>
              </div>
              <Check size={16} className="text-blue-500 opacity-50" />
            </Link>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 h-16 rounded-[17px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <>Mettre à jour le profil</>}
            </button>
          </div>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
