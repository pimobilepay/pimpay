"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  QrCode,
  User,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Download,
  Wallet,
  Calendar,
  Hash,
} from "lucide-react";

export default function MPayDetailsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const receiver = params.get("to") || "Utilisateur inconnu";
  const amount = params.get("amount") || "0";
  const status = params.get("status") || "success"; // success | failed | pending
  const txid = params.get("txid") || "TX-PMPY-9821739181";
  const method = params.get("method") || "MPay Wallet";

  const date =
    params.get("date") ||
    new Date().toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadge = () => {
    switch (status) {
      case "success":
        return (
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-sm font-medium">
            Succès
          </span>
        );
      case "failed":
        return (
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-500 text-sm font-medium">
            Échoué
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-sm font-medium">
            En attente
          </span>
        );
    }
  };

  return (
    <div className="p-6 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-lg"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">Détails du paiement</h1>
      </div>

      {/* ICONE STATUS */}
      <div className="flex justify-center mb-6">
        {status === "success" ? (
          <CheckCircle2 size={95} className="text-green-500 drop-shadow-lg" />
        ) : status === "failed" ? (
          <AlertTriangle size={95} className="text-red-500 drop-shadow-lg" />
        ) : (
          <QrCode size={95} className="text-yellow-500 drop-shadow-lg" />
        )}
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className="
          p-6 rounded-2xl
          bg-white/10 dark:bg-white/5
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          shadow-[0_8px_25px_rgba(0,0,0,0.25)]
          space-y-5
        "
      >
        {/* STATUS */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Statut</span>
          {getStatusBadge()}
        </div>

        {/* DESTINATAIRE */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="text-primary" />
            <span className="text-foreground">{receiver}</span>
          </div>
        </div>

        {/* MONTANT */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Coins className="text-primary" />
            <span className="text-foreground font-semibold">Montant</span>
          </div>
          <span className="text-foreground font-bold text-lg">
            {amount} π
          </span>
        </div>

        {/* DATE */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar className="text-primary" />
            <span className="text-foreground">Date</span>
          </div>
          <span className="text-foreground/80 text-sm text-right">
            {date}
          </span>
        </div>

        {/* TXID */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Hash className="text-primary" />
            <span className="text-foreground">ID Transaction</span>
          </div>
          <span className="text-foreground/80 text-sm">{txid}</span>
        </div>

        {/* MÉTHODE */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wallet className="text-primary" />
            <span className="text-foreground">Méthode</span>
          </div>
          <span className="text-foreground/80 text-sm">{method}</span>
        </div>
      </div>

      {/* BOUTONS ACTION */}
      <button
        className="
          w-full mt-8 py-4 rounded-xl text-lg font-semibold
          flex items-center justify-center gap-3
          bg-gradient-to-br from-blue-500 to-blue-300
          text-white shadow-lg active:scale-95 transition
        "
      >
        <Download size={22} /> Télécharger le reçu
      </button>

      <button
        className="
          w-full mt-3 py-4 rounded-xl text-lg font-semibold
          flex items-center justify-center gap-3
          bg-white/10 dark:bg-white/5
          border border-white/20 dark:border-white/10
          backdrop-blur-xl
          text-foreground active:scale-95 transition
        "
      >
        <Share2 size={22} /> Partager la transaction
      </button>
    </div>
  );
}
