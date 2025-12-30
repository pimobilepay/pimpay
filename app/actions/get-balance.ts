"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getUserWalletData() {
  const session = await auth();
  if (!session?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      wallets: true,
      virtualCards: true,
    },
  });

  return user;
}
