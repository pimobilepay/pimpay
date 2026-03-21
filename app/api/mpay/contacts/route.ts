export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch user's P2P contacts from recent transactions
export async function GET() {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    // Get contacts from recent transactions (sent to other users)
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        fromUserId: session.id,
        toUserId: { not: null },
        type: "TRANSFER",
        status: "SUCCESS",
      },
      select: {
        toUserId: true,
        toUser: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            avatar: true,
          }
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Group by user and get unique contacts
    const contactMap = new Map<string, any>();
    for (const tx of recentTransactions) {
      if (tx.toUser && !contactMap.has(tx.toUser.id)) {
        contactMap.set(tx.toUser.id, {
          id: tx.toUser.id,
          contactId: tx.toUser.id,
          name: tx.toUser.name || tx.toUser.username || "Utilisateur",
          username: tx.toUser.username,
          phone: tx.toUser.phone,
          avatar: tx.toUser.avatar,
          initials: getInitials(tx.toUser.name || tx.toUser.username || "U"),
          nickname: null,
          isFavorite: false,
          lastTransaction: tx.createdAt,
          transactionCount: 1,
        });
      }
    }

    const formattedContacts = Array.from(contactMap.values());

    return NextResponse.json({
      success: true,
      contacts: formattedContacts,
      total: formattedContacts.length,
      favorites: 0,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// POST: Search and return user info (simulated contact add)
export async function POST(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { identifier, nickname } = body;

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant requis" }, { status: 400 });
    }

    // Find user by username, phone, or ID
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.replace("@", "") },
          { phone: identifier },
          { id: identifier },
        ],
        NOT: { id: session.id }
      },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        avatar: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Contact trouve",
      contact: {
        id: targetUser.id,
        contactId: targetUser.id,
        name: targetUser.name || nickname || "Utilisateur",
        username: targetUser.username,
        phone: targetUser.phone,
        avatar: targetUser.avatar,
        initials: getInitials(targetUser.name || nickname || targetUser.username || "U"),
        nickname: nickname || null,
        isFavorite: false,
      }
    });
  } catch (error) {
    console.error("Error searching contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: Not implemented (Contact model doesn't exist)
export async function PATCH() {
  return NextResponse.json({ success: false, error: "Non implemente" }, { status: 501 });
}

// DELETE: Not implemented (Contact model doesn't exist)
export async function DELETE() {
  return NextResponse.json({ success: false, error: "Non implemente" }, { status: 501 });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
