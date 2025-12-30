import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { wallets: true }
  });

  if (!user) notFound();

  return (
    <div className="p-8">
      <AdminControlPanel 
        userId={user.id}
        userName={user.name || user.username || "Utilisateur"}
        userEmail={user.email || "Pas d'email"}
        currentRole={user.role}
      />
    </div>
  );
}
