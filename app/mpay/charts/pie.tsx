"use client";

import React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

export default function MPayPieChart({ data }) {
  // data example: [{ name: 'Boutique', value: 40 }, { name: 'Transferts', value: 30 }, ...]
  const COLORS = ["#4EA0FF", "#8A5CF6", "#FFB347", "#34D399", "#FB7185"];

  const chartData = data ?? [
    { name: "Boutiques", value: 40 },
    { name: "Transferts", value: 25 },
    { name: "Réception", value: 20 },
    { name: "Retraits", value: 10 },
    { name: "Autres", value: 5 },
  ];

  return (
    <div className="p-4 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-foreground mb-3">Répartition des paiements</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={4}
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--foreground)",
                backdropFilter: "blur(8px)",
              }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: "var(--muted-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
