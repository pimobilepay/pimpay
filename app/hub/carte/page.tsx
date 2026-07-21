"use client";

import useSWR from "swr";
import { HubShell } from "@/components/hub/HubShell";
import { AgentProfileCard } from "@/components/hub/AgentProfileCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Paliers d'agent basés sur le nombre de filleuls inscrits. */
const AGENT_TIERS = [
  { name: "BRONZE AGENT", min: 0, target: 10 as number | null, next: "SILVER AGENT" as string | null },
  { name: "SILVER AGENT", min: 10, target: 25 as number | null, next: "GOLD AGENT" as string | null },
  { name: "GOLD AGENT", min: 25, target: 50 as number | null, next: "PLATINUM AGENT" as string | null },
  { name: "PLATINUM AGENT", min: 50, target: 100 as number | null, next: "ELITE AGENT" as string | null },
  { name: "ELITE AGENT", min: 100, target: null as number | null, next: null as string | null },
];

function getAgentTier(count: number) {
  let current = AGENT_TIERS[0];
  for (const t of AGENT_TIERS) {
    if (count >= t.min) current = t;
  }
  if (current.target === null) {
    return { level: current.name, levelSubtitle: "Niveau le plus élevé", nextLevel: current.name, progress: 100 };
  }
  const span = current.target - current.min;
  const progress = Math.min(100, Math.max(0, Math.round(((count - current.min) / span) * 100)));
  return {
    level: current.name,
    levelSubtitle: `${count} filleul${count > 1 ? "s" : ""} recruté${count > 1 ? "s" : ""}`,
    nextLevel: current.next || current.name,
    progress,
  };
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n || 0);
}

function formatVolume(amount: number, currency = "XAF") {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount || 0)} ${currency}`;
}

export default function AgentCartePage() {
  const { data, isLoading } = useSWR("/api/agent/referral", fetcher);

  const agent = data?.agent;
  const stats = data?.stats || {};
  const achievements = data?.achievements || [];
  const code = agent?.referralCode || "";
  const referralLink = data?.referralLink || "";
  const qrValue = referralLink || code;

  const joinDate = agent?.createdAt
    ? new Date(agent.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  const tier = getAgentTier(stats.totalReferred || 0);

  const cardStats = {
    references: formatNumber(stats.totalReferred || 0),
    transactions: formatNumber(stats.transactions || 0),
    volume: formatVolume(stats.volumeTotal || 0, stats.currency || "XAF"),
    merchants: formatNumber(stats.merchants || 0),
    countries: formatNumber(stats.countriesServed || 0),
    successRate: `${stats.successRate || 0}%`,
  };

  return (
    <HubShell
      title="Ma Carte Agent Officiel"
      description="Votre profil officiel vérifié avec vos statistiques réelles et vos réalisations"
    >
      {isLoading || !agent ? (
        <div className="flex justify-center">
          <Skeleton className="h-[900px] w-full max-w-[520px] rounded-[2rem] bg-slate-700" />
        </div>
      ) : (
        <div className="flex justify-center">
          <AgentProfileCard
            name={agent.name}
            agentId={agent.agentId || undefined}
            code={code}
            role={agent.agentRole}
            avatar={agent.avatar}
            qrValue={qrValue}
            referralLink={referralLink}
            phone={agent.phone}
            email={agent.email}
            country={agent.country || undefined}
            joinDate={joinDate}
            level={tier.level}
            levelSubtitle={tier.levelSubtitle}
            nextLevel={tier.nextLevel}
            progress={tier.progress}
            stats={cardStats}
            achievements={achievements}
          />
        </div>
      )}
    </HubShell>
  );
}
