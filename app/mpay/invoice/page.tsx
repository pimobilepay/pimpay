"use client";

import { ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { generateStylishInvoice } from "@/components/pdf/generateInvoicePdf";

export default function MPayInvoicePage() {
  const router = useRouter();

  const invoice = {
    id: "INV-4829102",
    date: "15 Nov 2025",
    amount: "12.5 π",
    status: "Réussi",
    receiver: "John Doe",
    sender: "Vous",
    method: "Wallet Pi",
  };

  return (
    <div className="px-6 pt-24 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Facture MPay</h1>
      </div>

      {/* VISUAL PREVIEW */}
      <div
        className="
        p-6 rounded-2xl border border-white/20 bg-white/10 dark:bg-white/5
        backdrop-blur-2xl shadow-lg text-foreground
        "
      >
        <div className="flex justify-center mb-4">
          <Image
            src="/pi-logo.png"
            width={80}
            height={80}
            alt="Pi Logo"
            className="drop-shadow-[0_0_12px_rgba(255,180,0,0.5)]"
          />
        </div>

        <div className="space-y-2">
          <Detail label="ID Facture" value={invoice.id} />
          <Detail label="Date" value={invoice.date} />
          <Detail label="Montant" value={invoice.amount} />
          <Detail label="Expéditeur" value={invoice.sender} />
          <Detail label="Destinataire" value={invoice.receiver} />
          <Detail label="Méthode" value={invoice.method} />
          <Detail label="Statut" value={invoice.status} />
        </div>
      </div>

      {/* BUTTON: DOWNLOAD PDF */}
      <button
        onClick={() => generateStylishInvoice(invoice)}
        className="
          w-full mt-6 py-4 rounded-xl 
          bg-gradient-to-br from-purple-600 to-purple-400
          text-white font-semibold flex items-center justify-center gap-2
          shadow-xl active:scale-[0.97] transition
        "
      >
        <Download size={20} /> Télécharger la facture PDF
      </button>

    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/10">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
