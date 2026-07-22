/**
 * app/hub/supervisor/page.tsx
 * Page Supervision — accès réservé aux superviseurs et aux administrateurs.
 *
 * Garde côté serveur : on vérifie le rôle AVANT tout rendu.
 *  - Non authentifié            -> redirection vers /auth/login
 *  - AGENT sans agentRole SUPERVISOR / autre rôle -> redirection vers /hub
 *  - ADMIN ou AGENT+SUPERVISOR   -> rendu de l'UI de supervision
 */
import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SupervisorClient from "./SupervisorClient";

export const dynamic = "force-dynamic";

export default async function SupervisorPage() {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, agentRole: true },
  });

  const isAdmin = user?.role === "ADMIN";
  const isSupervisor = user?.role === "AGENT" && user?.agentRole === "SUPERVISOR";

  if (!isAdmin && !isSupervisor) {
    // Les agents standards et les clients sont renvoyés vers le hub
    redirect("/hub");
  }

  return <SupervisorClient />;
}
