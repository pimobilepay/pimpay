"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function MPayComparativeChart({ data }) {
  // data example: [{ period: 'Jan', inflow: 120, outflow: 80 }, ...]
  const chartData = data ?? [
    { period: "Jan", inflow: 120, outflow: 80 },
    { period: "Fév", inflow: 160, outflow: 110 },
    { period: "Mar", inflow: 90, outflow: 70 },
    { period: "Avr", inflow: 220, outflow: 140 },
    { period: "Mai", inflow: 300, outflow: 190 },
    { period: "Juin", inflow: 260, outflow: 200 },
  ];

  return (
    <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-foreground mb-3">Entrées vs Sorties (mensuel)</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -6, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="period" tick={{ fill: "var(--muted-foreground)" }} axisLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)" }} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--foreground)",
                backdropFilter: "blur(6px)",
              }}
            />
            <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
            <Bar dataKey="inflow" name="Entrées" stackId="a" fill="#4EA0FF" radius={[6, 6, 0, 0]} />
            <Bar dataKey="outflow" name="Sorties" stackId="a" fill="#FF7A7A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
