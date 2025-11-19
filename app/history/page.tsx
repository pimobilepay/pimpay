"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Clock, XCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";

export default function TransactionHistory() {

  const transactions = [
    {
      id: "TXN-98101",
      type: "Dépôt",
      amount: "+$150",
      pi: "+π 0.000477",
      date: "Aujourd’hui, 14:22",
      status: "success",
      icon: ArrowDownCircle,
    },
    {
      id: "TXN-98100",
      type: "Retrait",
      amount: "-$80",
      pi: "-π 0.000254",
      date: "Aujourd’hui, 09:10",
      status: "pending",
      icon: ArrowUpCircle,
    },
    {
      id: "TXN-98099",
      type: "Transfert",
      amount: "-$25",
      pi: "-π 0.000079",
      date: "Hier, 18:42",
      status: "failed",
      icon: ArrowUpCircle,
    },
    {
      id: "TXN-98098",
      type: "Recharge",
      amount: "-$10",
      pi: "-π 0.000031",
      date: "Hier, 12:17",
      status: "success",
      icon: ArrowUpCircle,
    },
  ];

  const statusColors = {
    success: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
    failed: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    pending: "text-yellow-700 dark:text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
  };

  const statusIcons = {
    success: CheckCircle2,
    failed: XCircle,
    pending: Clock,
  };

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
              Historique
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vos transactions récentes
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6">

        {/* FILTERS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {["Tous", "Dépôt", "Retrait", "Transfert", "Recharge"].map((filter) => (
            <button
              key={filter}
              className="
                px-4 py-2 rounded-xl text-sm 
                bg-white/60 dark:bg-white/5 
                border border-gray-300 dark:border-white/10 
                backdrop-blur-xl 
                hover:bg-white/80 dark:hover:bg-white/10 
                transition
                whitespace-nowrap
              "
            >
              {filter}
            </button>
          ))}
        </div>

        {/* TRANSACTIONS */}
        <div className="space-y-4">

          {transactions.map((tx) => {
            const Icon = tx.icon;
            const StatusIcon = statusIcons[tx.status];

            return (
              <Card
                key={tx.id}
                className="
                  border border-gray-200 dark:border-white/10
                  bg-white/70 dark:bg-white/5 
                  backdrop-blur-xl rounded-2xl shadow-md
                "
              >
                <CardContent className="p-5">

                  <div className="flex justify-between items-start">

                    {/* LEFT SIDE */}
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          h-12 w-12 rounded-xl 
                          bg-gradient-to-br 
                          from-yellow-300/20 to-yellow-600/30 
                          flex items-center justify-center 
                          text-yellow-600 dark:text-yellow-300
                          shadow-md
                        "
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div>
                        <p className="text-base font-semibold">{tx.type}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tx.date}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{tx.id}</p>
                      </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="text-right">
                      <p className="text-lg font-bold">{tx.amount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{tx.pi}</p>

                      <div
                        className={`
                          mt-2 inline-flex items-center gap-1 
                          px-2 py-1 rounded-lg text-xs border 
                          ${statusColors[tx.status]}
                        `}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span>
                          {tx.status === "success"
                            ? "Succès"
                            : tx.status === "failed"
                            ? "Échoué"
                            : "En attente"}
                        </span>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
