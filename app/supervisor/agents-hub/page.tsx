import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { AgentsHubClient } from "@/components/supervisor/AgentsHubClient";

export const metadata: Metadata = { title: "Hub des Agents | PiMobiPay", description: "Gestion ciblée des rôles agent et superviseur." };

export default async function AgentsHubPage() {
  const payload = await getAuthPayload();
  if (!payload) redirect("/auth/login?redirect=/supervisor/agents-hub");
  if (payload.role !== "SUPERVISEUR_PRINCIPAL") redirect("/dashboard");
  return <AgentsHubClient />;
}
