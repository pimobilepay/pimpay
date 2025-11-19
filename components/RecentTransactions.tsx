"use client";

import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

const demoTransactions = [
  {
    id: 1,
    label: "Transfert à Jules",
    amount: "-15.00$",
    type: "out",
    date: "Aujourd'hui",
  },
  {
    id: 2,
    label: "Dépôt Mobile Money",
    amount: "+50.00$",
    type: "in",
    date: "Hier",
  },
  {
    id: 3,
    label: "Paiement Marchand",
    amount: "-8.90$",
    type: "out",
    date: "Hier",
  },
];

export default function RecentTransactions() {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">Transactions Récentes</h2>

      <div className="space-y-3">
        {demoTransactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between bg-white dark:bg-darkCard p-4 rounded-xl shadow-sm dark:shadow-dark"
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-white
                  ${tx.type === "in" ? "bg-green-500" : "bg-red-500"}
                `}
              >
                {tx.type === "in" ? (
                  <ArrowDownLeft size={20} />
                ) : (
                  <ArrowUpRight size={20} />
                )}
              </div>

              <div>
                <p className="font-medium">{tx.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tx.date}</p>
              </div>
            </div>

            <p
              className={`font-semibold ${
                tx.type === "in" ? "text-green-500" : "text-red-500"
              }`}
            >
              {tx.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
