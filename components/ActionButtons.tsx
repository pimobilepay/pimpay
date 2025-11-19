"use client";

import { useRouter } from "next/navigation";
import { Download, Upload, Send, Smartphone } from "lucide-react";

const actions = [
  { icon: Download, label: "Dépôt", path: "/deposit" },
  { icon: Upload, label: "Retrait", path: "/withdraw" },
  { icon: Send, label: "Transfert", path: "/transfer" },
  { icon: Smartphone, label: "Recharge", path: "/recharge" }
];

export default function ActionButtons() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mt-6">
      {actions.map((a, i) => {
        const Icon = a.icon;

        return (
          <button
            key={i}
            onClick={() => router.push(a.path)}
            className="flex flex-col items-center focus:outline-none"
          >
            <div
              className="
                w-14 h-14 rounded-full 
                bg-soft dark:bg-darkCard 
                shadow-smooth dark:shadow-dark
                flex items-center justify-center
                active:scale-95 transition
              "
            >
              <Icon className="text-primary dark:text-gold" size={26} />
            </div>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {a.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
