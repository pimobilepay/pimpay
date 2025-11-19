"use client";

import {
  User,
  Mail,
  Phone,
  KeySquare,
  Shield,
  ChevronRight,
  Camera,
} from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="p-4 space-y-6">

      {/* TITRE */}
      <h1 className="text-2xl font-bold text-foreground mb-2">Profil</h1>

      {/* AVATAR */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="
          relative w-28 h-28 rounded-full 
          bg-gradient-to-br from-yellow-400 to-yellow-600
          dark:from-[#F1C27D] dark:to-[#A37738]
          flex items-center justify-center text-black font-bold text-3xl
          shadow-[0_0_20px_rgba(255,190,90,0.5)]
        ">
          <span>P</span>

          {/* ICON CAMERA */}
          <button
            className="
              absolute bottom-1 right-1 
              bg-black/60 dark:bg-white/20 
              p-2 rounded-full backdrop-blur-xl
            "
          >
            <Camera size={16} className="text-white" />
          </button>
        </div>

        <p className="text-muted-foreground text-sm">Changer la photo</p>
      </div>

      {/* CARD – INFORMATIONS DE BASE */}
      <ProfileCard title="Informations personnelles">
        <ProfileItem icon={<User />} label="Nom" value="Nom Utilisateur" />
        <ProfileItem icon={<Mail />} label="Email" value="pimpay@email.com" />
        <ProfileItem icon={<Phone />} label="Téléphone" value="+243 000 000 000" />
      </ProfileCard>

      {/* CARD – SÉCURITÉ */}
      <ProfileCard title="Sécurité du compte">
        <ProfileItem
          icon={<KeySquare />}
          label="Changer le mot de passe"
          action
        />
        <ProfileItem
          icon={<Shield />}
          label="Modifier le code PIN"
          action
        />
      </ProfileCard>

      {/* BOUTON MISE À JOUR */}
      <button
        className="
          w-full p-4 rounded-xl bg-primary text-primary-foreground 
          font-semibold shadow hover:opacity-90 transition
        "
      >
        Mettre à jour le profil
      </button>
    </div>
  );
}

/* ============================================================
   COMPOSANT: ProfileCard
============================================================ */

function ProfileCard({ title, children }) {
  return (
    <div
      className="
        bg-white/5 border border-white/10 
        backdrop-blur-xl p-5 rounded-xl shadow-xl
      "
    >
      <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ============================================================
   COMPOSANT: ProfileItem
============================================================ */

function ProfileItem({ icon, label, value, action }) {
  return (
    <div
      className="
        flex items-center justify-between 
        p-4 rounded-lg bg-white/5 hover:bg-white/10 
        transition cursor-pointer
      "
    >
      <div className="flex items-center gap-4">
        <span className="text-primary">{icon}</span>

        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{label}</span>
          {value && (
            <span className="text-foreground text-[15px] font-medium">
              {value}
            </span>
          )}
        </div>
      </div>

      {action && <ChevronRight size={18} className="text-muted-foreground" />}
    </div>
  );
}
