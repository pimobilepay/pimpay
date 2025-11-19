"use client";

import {
  Bell,
  KeySquare,
  ChevronRight,
  CircleHelp,
  ShieldCheck,
  Palette,
  Globe,
  LogOut,
  User,
  Smartphone,
  Lock
} from "lucide-react";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-6">

      {/* TITRE */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Paramètres
      </h1>

      {/* SECTION 1 – Profil */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Compte & Profil
        </h2>

        <div className="space-y-2">
          <SettingItem icon={<User />} label="Modifier le profil" />
          <SettingItem icon={<Smartphone />} label="Changer le numéro" />
          <SettingItem icon={<KeySquare />} label="Changer le mot de passe" />
        </div>
      </Card>

      {/* SECTION – Sécurité */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Sécurité
        </h2>

        <div className="space-y-2">
          <a href="/security">
            <SettingItem
              icon={<ShieldCheck />}
              label="Paramètres de sécurité"
            />
          </a>

          <SettingItem
            icon={<KeySquare />}
            label="Authentification & Clés"
          />

          <SettingItem
            icon={<Lock />}
            label="Confidentialité avancée"
          />
        </div>
      </Card>

      {/* SECTION 2 – Notifications */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Notifications
        </h2>

        <div className="space-y-2">
          <SettingItem icon={<Bell />} label="Notifications système" />
          <SettingItem icon={<Bell />} label="Alertes de paiement" />
        </div>
      </Card>

      {/* SECTION 3 – Affichage */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Affichage & Apparence
        </h2>

        <div className="space-y-2">
          <ThemeToggleItem />
          <SettingItem icon={<Globe />} label="Langue & Région" />
        </div>
      </Card>

      {/* SECTION 4 – Aide */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Support & Aide
        </h2>

        <div className="space-y-2">
          <SettingItem icon={<CircleHelp />} label="FAQ" />
		  <a href="/politique-confidentialite">
          <SettingItem icon={<ShieldCheck />} label="Politique de confidentialité" />
		  </a>
        </div>
      </Card>

      {/* BOUTON DÉCONNEXION */}
      <button
        className="
          w-full mt-4 flex items-center justify-center gap-2
          px-4 py-3 rounded-xl 
          bg-red-500/20 text-red-400 border border-red-500/30
          hover:bg-red-500/30 transition-all
        "
      >
        <LogOut size={20} />
        Déconnexion
      </button>
    </div>
  );
}

/* ===========================================================================================================
   COMPOSANT: SettingItem
=========================================================================================================== */

function SettingItem({ icon, label }) {
  return (
    <button
      className="
        w-full flex items-center justify-between
        p-4 rounded-lg bg-white/5 hover:bg-white/10
        transition-all duration-200
        text-left
      "
    >
      <div className="flex items-center gap-4">
        <span className="text-primary">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>

      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}

/* ===========================================================================================================
   COMPOSANT: ThemeToggleItem 
=========================================================================================================== */

function ThemeToggleItem() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const enabled = !darkMode;
    setDarkMode(enabled);

    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="
        w-full flex items-center justify-between 
        p-4 rounded-lg bg-white/5 hover:bg-white/10
        transition-all duration-200
      "
    >
      <div className="flex items-center gap-4">
        <Palette className="text-blue-400" size={20} />
        <span className="text-sm text-foreground">Mode clair / sombre</span>
      </div>

      <div
        className={`
          w-12 h-6 rounded-full p-1 flex items-center transition-all
          ${darkMode ? "bg-blue-500" : "bg-gray-400"}
        `}
      >
        <div
          className={`
            w-5 h-5 rounded-full bg-white shadow transition-all
            ${darkMode ? "translate-x-6" : "translate-x-0"}
          `}
        ></div>
      </div>
    </button>
  );
}
