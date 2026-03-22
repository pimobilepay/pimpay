export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch user's P2P contacts from database or transactions
export async function GET() {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    // Try to get saved contacts from P2PContact table
    const savedContacts = await prisma.p2PContact.findMany({
      where: { userId: session.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            avatar: true,
          }
        }
      },
      orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }]
    }) as any;

    // Format saved contacts
    const formattedSavedContacts = savedContacts.map((pc: any) => ({
      id: pc.id,
      contactId: pc.contactId,
      name: pc.contact.name || pc.name,
      username: pc.contact.username,
      phone: pc.contact.phone,
      avatar: pc.contact.avatar,
      initials: getInitials(pc.contact.name || pc.name || "U"),
      nickname: pc.nickname,
      isFavorite: pc.isFavorite,
      lastTransaction: null,
      transactionCount: 0,
    }));

    if (formattedSavedContacts.length > 0) {
      return NextResponse.json({
        success: true,
        contacts: formattedSavedContacts,
        total: formattedSavedContacts.length,
        favorites: formattedSavedContacts.filter((c: any) => c.isFavorite).length,
      });
    }

    // Fallback: Get contacts from recent transactions
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

// POST: Add or search user
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

    // Check if already a contact
    const existingContact = await prisma.p2PContact.findUnique({
      where: {
        userId_contactId: {
          userId: session.id,
          contactId: targetUser.id,
        }
      }
    });

    if (existingContact) {
      return NextResponse.json({ success: false, error: "Deja dans vos contacts" }, { status: 400 });
    }

    // Create new contact
    const newContact = await prisma.p2PContact.create({
      data: {
        userId: session.id,
        contactId: targetUser.id,
        name: targetUser.name || "Utilisateur",
        nickname: nickname || null,
        isFavorite: false,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Contact ajoute",
      contact: {
        id: newContact.id,
        contactId: newContact.contactId,
        name: targetUser.name || newContact.name,
        username: targetUser.username,
        phone: targetUser.phone,
        avatar: targetUser.avatar,
        initials: getInitials(targetUser.name || targetUser.username || "U"),
        nickname: newContact.nickname,
        isFavorite: newContact.isFavorite,
      }
    });
  } catch (error) {
    console.error("Error searching contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: Update contact (toggle favorite)
export async function PATCH(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, isFavorite } = body;

    if (!contactId) {
      return NextResponse.json({ success: false, error: "Contact ID requis" }, { status: 400 });
    }

    // Update contact
    const updatedContact = await prisma.p2PContact.updateMany({
      where: {
        userId: session.id,
        id: contactId,
      },
      data: {
        isFavorite: isFavorite,
      }
    });

    if (updatedContact.count === 0) {
      return NextResponse.json({ success: false, error: "Contact non trouve" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: isFavorite ? "Ajoute aux favoris" : "Retire des favoris",
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: Delete contact
export async function DELETE(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("id");

    if (!contactId) {
      return NextResponse.json({ success: false, error: "ID requis" }, { status: 400 });
    }

    // Delete contact
    const deletedContact = await prisma.p2PContact.deleteMany({
      where: {
        userId: session.id,
        id: contactId,
      }
    });

    if (deletedContact.count === 0) {
      return NextResponse.json({ success: false, error: "Contact non trouve" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Contact supprime",
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
