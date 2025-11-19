"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="
      min-h-screen flex items-center justify-center 
      bg-soft dark:bg-darkBg 
      px-6
    ">
      {/* CARD */}
      <div className="
        w-full max-w-md 
        bg-white/60 dark:bg-white/10 
        backdrop-blur-xl 
        border border-white/30 dark:border-white/10 
        rounded-2xl shadow-xl 
        p-8 animate-fadeIn
      ">
        
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-pimpay.png"
            alt="PIMPAY"
            width={80}
            height={80}
            className="
              drop-shadow-[0_0_12px_rgba(255,180,0,0.5)]
              dark:drop-shadow-[0_0_15px_rgba(255,180,80,0.7)]
            "
          />
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-center text-foreground mb-2">
          Connexion
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Accédez à votre espace personnel
        </p>

        {/* FORM */}
        <form className="space-y-6">

          {/* EMAIL */}
          <div>
            <label className="text-sm text-foreground font-medium">
              Adresse email
            </label>
            <div className="
              mt-1 flex items-center gap-3
              bg-white/70 dark:bg-white/5 
              border border-white/40 dark:border-white/10
              rounded-xl px-4 py-3
            ">
              <Mail className="text-muted-foreground" size={20} />
              <input
                type="email"
                placeholder="exemple@email.com"
                className="
                  w-full bg-transparent outline-none 
                  text-foreground placeholder-muted-foreground
                "
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm text-foreground font-medium">
              Mot de passe
            </label>

            <div className="
              mt-1 flex items-center gap-3
              bg-white/70 dark:bg-white/5 
              border border-white/40 dark:border-white/10
              rounded-xl px-4 py-3
            ">
              <Lock className="text-muted-foreground" size={20} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                className="
                  w-full bg-transparent outline-none 
                  text-foreground placeholder-muted-foreground
                "
              />

              <button
                type="button"
                onClick={togglePassword}
                className="text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* FORGOT PASSWORD */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            className="
              w-full py-3 rounded-xl
              bg-gradient-to-r from-indigo-600 to-violet-500
              text-white font-semibold text-lg
              shadow-lg shadow-indigo-500/30
              active:scale-[0.98] transition
            "
            onClick={() => router.push("/")}
          >
            Se connecter
          </button>

        </form>

        {/* REGISTER LINK */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Pas encore de compte ?
          <button
            onClick={() => router.push("/register")}
            className="text-blue-600 dark:text-blue-400 ml-1 hover:underline"
          >
            S’inscrire
          </button>
        </p>

      </div>
    </div>
  );
}
