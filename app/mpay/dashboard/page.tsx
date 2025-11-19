"use client";

import React from "react";
import { useRouter } from "next/navigation";
import MPayPieChart from "../charts/pie";
import MPayComparativeChart from "../charts/comparative";
import MPayAnimatedChart from "../charts/animated";
import { ArrowLeft, PieChart as PieIcon } from "lucide-react";

export default function MPayDashboardPage() {
  const router = useRouter();

  // sample KPI values - you will replace with real API data
  const kpis = {
    balancePi: "125.82 π",
    monthlyVolume: "1,254 π",
    monthlyTx: 132,
    successRate: "97%",
  };

  return (
    <div className="px-6 pt-24 pb-28 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Dashboard MPay</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Solde</p>
          <h2 className="text-xl font-bold text-foreground">{kpis.balancePi}</h2>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Volume ce mois</p>
          <h2 className="text-xl font-bold text-foreground">{kpis.monthlyVolume}</h2>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <h2 className="text-xl font-bold text-foreground">{kpis.monthlyTx}</h2>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Taux de succès</p>
          <h2 className="text-xl font-bold text-foreground">{kpis.successRate}</h2>
        </div>
      </div>

      {/* Charts area */}
      <div className="grid grid-cols-1 gap-4">
        <div className="grid md:grid-cols-2 gap-4">
          <MPayPieChart />
          <MPayComparativeChart />
        </div>

        <MPayAnimatedChart />
      </div>
    </div>
  );
}
