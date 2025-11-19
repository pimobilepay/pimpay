"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/bottom-nav"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";
import { getLocalCurrency } from "@/lib/currency-utils";

export default function HomePage() {
  const [showBalance, setShowBalance] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [localCurrency, setLocalCurrency] = useState({
    currency: "USD",
    currencySymbol: "$",
    exchangeRate: 1,
  });

  const piBalance = 1250.75;
  const piValueInUSD = 314159.0;

  useEffect(() => {
    setLocalCurrency(getLocalCurrency());
  }, []);

  return (
    <div
      className={`min-h-screen pb-20 transition-colors duration-300 ${
        darkMode ? "bg-background text-foreground" : "bg-white text-black"
      }`}
    >
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground px-4 pt-8 pb-8 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PIMPAY</h1>
            <p className="text-[13px] opacity-90 mt-1">Pi Mobile Pay</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "☀️" : "🌙"}
            </Button>
          </div>
        </div>

        {/* SOLDE */}
        <Card className="bg-white/10 backdrop-blur-xl p-6 border-0 shadow-2xl">
          <p className="text-sm text-primary-foreground/80 mb-2">Solde Total</p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold text-primary-foreground">
              {showBalance ? `π ${piBalance.toFixed(2)}` : "••••••"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary-foreground/80">1 Pi =</span>
            <span className="font-semibold text-primary-foreground text-base">
              $
              {piValueInUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              USD
            </span>
          </div>
        </Card>
      </div>

      {/* ACTIONS */}
      <div className="px-4 py-6 -mt-4">
        <div className="grid grid-cols-4 gap-3 mb-8">
          <a href="/deposit" className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <ArrowDownToLine className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs text-center font-medium">Dépôt</span>
          </a>

          <a href="/withdraw" className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-secondary to-chart-2 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <ArrowUpFromLine className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs text-center font-medium">Retrait</span>
          </a>

          <a href="/mpay" className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs text-center font-medium">MPay</span>
          </a>

          <a href="/transfer" className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent to-chart-3 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <Send className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs text-center font-medium">Transfert</span>
          </a>
        </div>

        {/* TRANSACTIONS */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Transactions Récentes</h2>
          <div className="space-y-3">
            {/* Transaction 1 */}
            <Card className="p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-chart-2 flex items-center justify-center">
                    <ArrowDownToLine className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Dépôt Mobile Money</p>
                    <p className="text-sm text-muted-foreground">Il y a 2 heures</p>
                  </div>
                </div>
                <span className="font-semibold text-secondary text-lg">+π 0.005</span>
              </div>
            </Card>

            {/* Transaction 2 */}
            <Card className="p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <ArrowUpFromLine className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Retrait vers MTN</p>
                    <p className="text-sm text-muted-foreground">Hier</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground text-lg">-π 25.50</span>
              </div>
            </Card>

            {/* Transaction 3 */}
            <Card className="p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Recharge Mobile</p>
                    <p className="text-sm text-muted-foreground">Il y a 3 jours</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground text-lg">-π 5.00</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <BottomNav />
    </div>
  );
}
