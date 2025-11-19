"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function MPayStatisticsPage() {
  const router = useRouter();

  // Fake data — tu pourras connecter l’API plus tard
  const data = [
    { month: "Jan", amount: 12 },
    { month: "Fév", amount: 18 },
    { month: "Mar", amount: 9 },
    { month: "Avr", amount: 22 },
    { month: "Mai", amount: 30 },
    { month: "Juin", amount: 26 },
    { month: "Juil", amount: 40 },
  ];

  return (
    <div className="px-6 pt-24 pb-28">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">
          Statistiques des paiements
        </h1>
      </div>

      {/* CARD */}
      <div className="
        p-6 rounded-2xl border border-white/20 
        bg-white/10 dark:bg-white/5
        backdrop-blur-2xl shadow-lg text-foreground
      ">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Paiements des 7 derniers mois
        </h2>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.15)"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tick={{ fill: "var(--foreground)" }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#ddd" }}
              />

              <Line
                type="monotone"
                dataKey="amount"
                stroke="#8A5CF6"
                strokeWidth={3}
                dot={{
                  stroke: "#8A5CF6",
                  strokeWidth: 2,
                  r: 4,
                  fill: "#fff",
                }}
                activeDot={{
                  r: 6,
                  fill: "#FFB347",
                  stroke: "#fff",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
