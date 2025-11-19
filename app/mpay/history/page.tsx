"use client";

import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Search, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MPayHistory() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const transactions = [
    {
      id: "TX-938291",
      name: "John Doe",
      amount: "-12.5 π",
      type: "sent",
      date: "Aujourd’hui",
      time: "14:32",
      status: "success",
    },
    {
      id: "TX-728192",
      name: "Sarah K.",
      amount: "+30 π",
      type: "received",
      date: "Aujourd’hui",
      time: "10:15",
      status: "success",
    },
    {
      id: "TX-182992",
      name: "Market Store",
      amount: "-8.3 π",
      type: "sent",
      date: "Hier",
      time: "18:09",
      status: "failed",
    },
    {
      id: "TX-182882",
      name: "David M.",
      amount: "+50 π",
      type: "received",
      date: "Hier",
      time: "11:22",
      status: "success",
    },
  ];

  const grouped = transactions.reduce((acc, txn) => {
    acc[txn.date] = acc[txn.date] || [];
    acc[txn.date].push(txn);
    return acc;
  }, {});

  const statusStyle = {
    success: "text-green-500 bg-green-500/20",
    failed: "text-red-500 bg-red-500/20",
    pending: "text-yellow-500 bg-yellow-500/20",
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
        <h1 className="text-xl font-bold text-foreground">Historique des paiements</h1>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="flex items-center gap-3 bg-white/10 dark:bg-white/5 p-3 rounded-xl border border-white/20 mb-6">
        <Search className="text-muted-foreground" size={20} />
        <input
          type="text"
          placeholder="Rechercher une transaction..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* LISTE DES TRANSACTIONS */}
      <div className="space-y-8">
        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <h2 className="text-sm text-muted-foreground mb-3">{date}</h2>

            <div className="space-y-3">
              {grouped[date]
                .filter((txn) =>
                  txn.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() =>
                      router.push(`/mpay/details?id=${txn.id}`)
                    }
                    className="
                      w-full flex items-center justify-between
                      p-4 rounded-xl bg-white/10 dark:bg-white/5
                      border border-white/10 backdrop-blur-xl
                      active:scale-[0.98] transition
                    "
                  >
                    {/* ICON */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center
                          ${
                            txn.type === "sent"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-green-500/20 text-green-500"
                          }
                        `}
                      >
                        {txn.type === "sent" ? (
                          <ArrowUpRight size={22} />
                        ) : (
                          <ArrowDownLeft size={22} />
                        )}
                      </div>

                      {/* INFO */}
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{txn.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock size={14} /> {txn.time}
                        </p>
                      </div>
                    </div>

                    {/* AMOUNT + STATUS */}
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{txn.amount}</p>
                      <span
                        className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${statusStyle[txn.status]}
                        `}
                      >
                        {txn.status === "success"
                          ? "Réussi"
                          : txn.status === "failed"
                          ? "Échoué"
                          : "En attente"}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
