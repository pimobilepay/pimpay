"use client";

import useSWR from "swr";
import { HubShell } from "@/components/hub/HubShell";
import { AgentIdBadge } from "@/components/hub/AgentIdBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCheck } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentBadgePage() {
  const { data, isLoading } = useSWR("/api/agent/referral", fetcher);

  const agent = data?.agent;
  const code = agent?.referralCode || "";
  const referralLink = data?.referralLink || "";
  const qrValue = referralLink || code;

  const joinDate = agent?.createdAt
    ? new Date(agent.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <HubShell
      title="Badge Agent"
      description="Téléchargez votre badge officiel recto-verso au format PNG ou PDF"
    >
      <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black text-white flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            Mon Badge Officiel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !agent ? (
            <div className="flex justify-center gap-4">
              <Skeleton className="h-[600px] w-[300px] rounded-[2rem] bg-slate-700" />
              <Skeleton className="hidden h-[600px] w-[300px] rounded-[2rem] bg-slate-700 sm:block" />
            </div>
          ) : (
            <AgentIdBadge
              name={agent.name}
              code={code}
              avatar={agent.avatar}
              qrValue={qrValue}
              phone={agent.phone}
              email={agent.email}
              country={agent.country || undefined}
              joinDate={joinDate}
            />
          )}
        </CardContent>
      </Card>
    </HubShell>
  );
}
