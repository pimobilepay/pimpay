"use client";

import BalanceCard from "@/components/BalanceCard";
import ActionButtons from "@/components/ActionButtons";
import StatisticsCard from "@/components/StatisticsCard";
import RecentTransactions from "@/components/RecentTransactions";
import BottomNav from "@/components/bottom-nav";

export default function Home() {
  return (
    <main className="pb-24 px-5 pt-10">

      {/* TITRE */}
      <h1 className="text-3xl font-bold text-center">PIMPAY</h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
        Pi Mobile Money
      </p>

      {/* SOLDE */}
      <BalanceCard />

      {/* ACTIONS */}
      <div className="mt-6">
        <ActionButtons />
      </div>

      {/* STATISTIQUES */}
      <div className="mt-8">
        <StatisticsCard />
      </div>

      {/* TRANSACTIONS RÉCENTES */}
      <RecentTransactions />

      {/* NAVIGATION */}
      <BottomNav />
    </main>
  );
}
