import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgentsHubClient } from "@/components/supervisor/AgentsHubClient";

export const metadata: Metadata = { title: "Hub des Agents | PiMobiPay", description: "Gestion ciblée des rôles agent et superviseur." };

export default async function AgentsHubPage() {
  const payload = await getAuthPayload();
  if (!payload) redirect("/auth/login?redirect=/supervisor/agents-hub");
  if (payload.role !== "SUPERVISEUR_PRINCIPAL") redirect("/dashboard");
  const supervisor = await prisma.user.findUnique({ where: { id: payload.id }, select: { agentType: true, status: true } });
  if (!supervisor || supervisor.status !== "ACTIVE" || supervisor.agentType !== "ADMINISTRATIF") redirect("/dashboard");
  return <AgentsHubClient />;
}
