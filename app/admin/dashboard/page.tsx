"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import {
  LogOut,
  User,
  Shield,
  Key,
  Users,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  ArrowUpRight,
  Ban,
} from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.user || data.user.role !== "ADMIN") {
          router.replace("/auth/login");
          return;
        }
        setAdmin(data.user);
      } catch (err) {
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/auth/login");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* HEADER SECTION */}
      <div className="px-6 pt-12 pb-12 bg-gradient-to-b from-red-600/10 to-transparent">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-[3px]">
                Admin Mode
              </span>
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter">
              COMMAND CENTER
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 active:scale-90 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* QUICK STATS GRID - Correction des props subText */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Volume Pi"
            value="π 1.2M"
            subText="+12% ce mois"
            icon={<Zap size={16} className="text-yellow-400" />}
          />
          <StatCard
            label="Utilisateurs"
            value="4,850"
            subText="24 nouveaux"
            icon={<Users size={16} className="text-blue-400" />}
          />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* TAB SELECTOR */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            label="Global"
          />
          <TabButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            label="Utilisateurs"
          />
          <TabButton
            active={activeTab === "kyc"}
            onClick={() => setActiveTab("kyc")}
            label="KYC (12)"
          />
        </div>

        {/* CONTENT BY TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">
              État du Système
            </h3>
            <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6 space-y-4">
              <SystemItem
                icon={<Activity size={18} />}
                label="API Status"
                value="Opérationnel"
                color="text-green-400"
              />
              <SystemItem
                icon={<Shield size={18} />}
                label="Blockchain Sync"
                value="99.9%"
                color="text-blue-400"
              />
              <SystemItem
                icon={<AlertTriangle size={18} />}
                label="Alertes Sécurité"
                value="0 Critique"
                color="text-slate-400"
              />
            </Card>

            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2 mt-8">
              Profil Administrateur
            </h3>
            <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-500 to-red-800 flex items-center justify-center font-black">
                {admin.name[0]}
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{admin.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  {admin.email}
                </p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                className="w-full h-12 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none focus:border-blue-500/50"
                placeholder="Rechercher un utilisateur..."
              />
            </div>

            <div className="space-y-3">
              <UserRow
                name="Jean Dupont"
                email="j.dupont@mail.com"
                status="Vérifié"
              />
              <UserRow
                name="Sarah Connor"
                email="terminator@mail.com"
                status="En attente"
              />
              <UserRow
                name="Marc Evans"
                email="m.evans@mail.com"
                status="Vérifié"
              />
            </div>
          </div>
        )}

        {activeTab === "kyc" && (
          <div className="space-y-4">
            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] text-center">
              <Shield size={32} className="text-yellow-500 mx-auto mb-3" />
              <h3 className="font-bold">Vérifications KYC</h3>
              <p className="text-xs text-slate-400 mt-1">
                12 dossiers sont en attente de validation manuelle.
              </p>
            </div>
            <Button className="w-full h-14 bg-white text-black font-black italic rounded-2xl">
              OUVRIR LA FILE D'ATTENTE
            </Button>
          </div>
        )}
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

// COMPOSANTS INTERNES - Correction de la destructuration { subText }
function StatCard({
  label,
  value,
  subText,
  icon,
}: {
  label: string;
  value: string;
  subText?: string;
  icon: any;
}) {
  return (
    <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 space-y-3">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-800 rounded-xl">{icon}</div>
        <ArrowUpRight size={14} className="text-slate-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
          {label}
        </p>
        <p className="text-xl font-black italic">{value}</p>
        <p className="text-[9px] text-green-400 font-bold mt-1 uppercase tracking-tighter">
          {subText}
        </p>
      </div>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl font-black italic text-xs uppercase tracking-widest transition-all ${
        active
          ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105"
          : "bg-slate-900 text-slate-500 border border-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function SystemItem({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-950 rounded-xl text-slate-500">{icon}</div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
          {label}
        </span>
      </div>
      <span className={`text-xs font-black italic ${color}`}>{value}</span>
    </div>
  );
}

function UserRow({
  name,
  email,
  status,
}: {
  name: string;
  email: string;
  status: string;
}) {
  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-bold">{name}</p>
          <p className="text-[10px] text-slate-500">{email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
            status === "Vérifié"
              ? "bg-green-500/10 text-green-500"
              : "bg-yellow-500/10 text-yellow-500"
          }`}
        >
          {status}
        </span>
        <button className="p-2 text-slate-700 hover:text-red-500">
          <Ban size={14} />
        </button>
      </div>
    </div>
  );
}
