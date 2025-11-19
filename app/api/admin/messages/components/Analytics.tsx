"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export default function Analytics({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/messages/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data.stats);
    }
    load();
  }, [token]);

  if (!stats) return <p className="text-sm">Chargement des statistiques...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
      <Card className="p-4">
        <h2 className="text-lg font-semibold">Utilisateurs</h2>
        <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Messages totaux</h2>
        <p className="text-3xl font-bold mt-2">{stats.totalMessages}</p>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Messages aujourd’hui</h2>
        <p className="text-3xl font-bold mt-2">{stats.messagesToday}</p>
      </Card>
    </div>
  );
}
