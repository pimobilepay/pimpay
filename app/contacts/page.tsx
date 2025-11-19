"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f7] dark:bg-[#0a0a0c] text-gray-900 dark:text-white pb-24">

      {/* HEADER */}
      <div
        className="
          px-4 py-6 sticky top-0 z-40 
          bg-white/60 dark:bg-black/40 
          backdrop-blur-xl 
          border-b border-gray-300 dark:border-white/10
        "
      >
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="
                rounded-full 
                bg-black/5 hover:bg-black/10 
                dark:bg-white/10 dark:hover:bg-white/20
              "
            >
              <ArrowLeft className="h-5 w-5 text-gray-800 dark:text-yellow-300" />
            </Button>
          </Link>

          <div>
            <h1
              className="
                text-2xl font-bold 
                text-gray-900 
                dark:text-yellow-300 dark:drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]
              "
            >
              Contact PIMPAY
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nous sommes là pour vous aider
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6">

        {/* SUPPORT CARD */}
        <Card
          className="
            border border-gray-200 dark:border-white/10 
            bg-white/70 dark:bg-white/5 
            backdrop-blur-xl 
            shadow-lg rounded-2xl
          "
        >
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-yellow-300">
              Service Client
            </h2>

            <div className="space-y-4 text-sm">
              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-700 dark:text-yellow-300" />
                <div>
                  <p className="font-medium">Téléphone</p>
                  <p className="text-gray-600 dark:text-gray-400">+243 820 000 000</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-700 dark:text-yellow-300" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600 dark:text-gray-400">support@pimpay.com</p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-700 dark:text-yellow-300" />
                <div>
                  <p className="font-medium">Heures d'assistance</p>
                  <p className="text-gray-600 dark:text-gray-400">24h/24 - 7j/7</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COMPANY CARD */}
        <Card
          className="
            border border-gray-200 dark:border-white/10 
            bg-white/70 dark:bg-white/5 
            backdrop-blur-xl 
            shadow-lg rounded-2xl
          "
        >
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-yellow-300">
              Informations de l’entreprise
            </h2>

            <div className="space-y-4 text-sm">
              {/* Location */}
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-700 dark:text-yellow-300" />
                <div>
                  <p className="font-medium">Adresse</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Siège PIMPAY, Kinshasa, République Démocratique du Congo
                  </p>
                </div>
              </div>

              {/* Email Pro */}
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-700 dark:text-yellow-300" />
                <div>
                  <p className="font-medium">Contact professionnel</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    business@pimpay.com
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QUICK HELP */}
        <Card
          className="
            border border-gray-200 dark:border-white/10 
            bg-white/70 dark:bg-white/5 
            backdrop-blur-xl 
            shadow-lg rounded-2xl
          "
        >
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-yellow-300">
              Besoin d’aide rapide ?
            </h2>

            <div className="flex flex-wrap gap-3">
              {[
                "Vérifier une transaction",
                "Problème de connexion",
                "Compte bloqué",
                "Dépôt / Retrait",
              ].map((label, i) => (
                <button
                  key={i}
                  className="
                    px-3 py-2 text-xs rounded-lg 
                    bg-yellow-300/10 dark:bg-yellow-300/10 
                    text-yellow-700 dark:text-yellow-300 
                    border border-yellow-300/20 
                    hover:bg-yellow-300/20 
                    transition
                  "
                >
                  {label}
                </button>
              ))}
            </div>

            {/* CHATBOT BUTTON */}
            <Button
              className="
                mt-6 w-full py-5 rounded-xl 
                bg-gradient-to-r from-yellow-300 to-yellow-500 
                text-black font-semibold 
                shadow-[0_4px_12px_rgba(255,215,0,0.4)]
                hover:scale-[1.02] transition
              "
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Ouvrir le chatbot
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
