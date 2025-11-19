"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

export default function MPayAnimatedChart({ data }) {
  // data example: [{ month: 'Jan', amount: 12 }, ...]
  const chartData = data ?? [
    { month: "Jan", amount: 12 },
    { month: "Fév", amount: 18 },
    { month: "Mar", amount: 9 },
    { month: "Avr", amount: 22 },
    { month: "Mai", amount: 30 },
    { month: "Juin", amount: 26 },
    { month: "Juil", amount: 40 },
  ];

  return (
    <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-foreground mb-3">Tendance des paiements</h3>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8A5CF6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#8A5CF6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)" }} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--foreground)",
                backdropFilter: "blur(6px)",
              }}
            />
            <Area type="monotone" dataKey="amount" stroke="#8A5CF6" fill="url(#gradBlue)" strokeWidth={3} />
            <Line type="monotone" dataKey="amount" stroke="#FFB347" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
