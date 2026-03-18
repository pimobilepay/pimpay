export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch user's P2P contacts
export async function GET() {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    // Fetch user's contacts with their details
    const contacts = await prisma.contact.findMany({
      where: { userId: session.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            image: true,
          }
        }
      },
      orderBy: [
        { isFavorite: "desc" },
        { lastTransaction: "desc" },
        { createdAt: "desc" }
      ]
    });

    const formattedContacts = contacts.map((c) => ({
      id: c.id,
      contactId: c.contact.id,
      name: c.contact.name || c.nickname || "Utilisateur",
      username: c.contact.username,
      phone: c.contact.phone,
      avatar: c.contact.image,
      initials: getInitials(c.contact.name || c.nickname || c.contact.username || "U"),
      nickname: c.nickname,
      isFavorite: c.isFavorite,
      lastTransaction: c.lastTransaction,
      transactionCount: c.transactionCount,
    }));

    return NextResponse.json({
      success: true,
      contacts: formattedContacts,
      total: formattedContacts.length,
      favorites: formattedContacts.filter(c => c.isFavorite).length,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// POST: Add a new P2P contact
export async function POST(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { identifier, nickname } = body; // identifier can be username or phone

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
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId: session.id,
        contactId: targetUser.id,
      }
    });

    if (existingContact) {
      return NextResponse.json({ success: false, error: "Contact deja ajoute" }, { status: 409 });
    }

    // Create contact
    const newContact = await prisma.contact.create({
      data: {
        userId: session.id,
        contactId: targetUser.id,
        nickname: nickname || null,
        isFavorite: false,
        transactionCount: 0,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Contact ajoute avec succes",
      contact: {
        id: newContact.id,
        contactId: newContact.contact.id,
        name: newContact.contact.name || nickname || "Utilisateur",
        username: newContact.contact.username,
        phone: newContact.contact.phone,
        avatar: newContact.contact.image,
        initials: getInitials(newContact.contact.name || nickname || newContact.contact.username || "U"),
        nickname: newContact.nickname,
        isFavorite: newContact.isFavorite,
      }
    });
  } catch (error) {
    console.error("Error adding contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: Update contact (toggle favorite, update nickname)
export async function PATCH(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, isFavorite, nickname } = body;

    if (!contactId) {
      return NextResponse.json({ success: false, error: "ID contact requis" }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: session.id,
      }
    });

    if (!contact) {
      return NextResponse.json({ success: false, error: "Contact introuvable" }, { status: 404 });
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(typeof isFavorite === "boolean" && { isFavorite }),
        ...(nickname !== undefined && { nickname }),
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: isFavorite ? "Ajoute aux favoris" : "Retire des favoris",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: Remove a contact
export async function DELETE(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("id");

    if (!contactId) {
      return NextResponse.json({ success: false, error: "ID contact requis" }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: session.id,
      }
    });

    if (!contact) {
      return NextResponse.json({ success: false, error: "Contact introuvable" }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: contactId }
    });

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
