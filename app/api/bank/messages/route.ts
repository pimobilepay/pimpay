import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Helper to check if user has bank admin access
async function checkBankAccess(req: Request) {
  const session = await verifyAuth(req as any);
  if (!session) {
    return { error: "Non autorise", status: 401 };
  }
  if (session.role !== "BANK_ADMIN" && session.role !== "ADMIN") {
    return { error: "Acces refuse. Portail reserve aux administrateurs de la Banque.", status: 403 };
  }
  return { session: { ...session, userId: session.id } };
}

// GET - Get messages/conversations
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    if (conversationId) {
      // Get ticket with its messages
      const ticket = await prisma.supportTicket.findUnique({
        where: {
          id: conversationId,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return NextResponse.json({
        conversationId,
        messages: ticket?.messages.map((m) => ({
          id: m.id,
          content: m.content,
          sender: m.senderId,
          timestamp: m.createdAt,
        })) || [],
      });
    }

    // Get all conversations (support tickets)
    const [conversations, total] = await Promise.all([
      prisma.supportTicket.findMany({
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.supportTicket.count(),
    ]);

    // Group by status
    const statusCounts = await prisma.supportTicket.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        subject: c.subject,
        lastMessage: c.messages[0]?.content || "",
        user: c.user,
        status: c.status,
        priority: c.priority,
        createdAt: c.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        total,
        open: statusCounts.find((s) => s.status === "OPEN")?._count || 0,
        inProgress: statusCounts.find((s) => s.status === "IN_PROGRESS")?._count || 0,
        resolved: statusCounts.find((s) => s.status === "CLOSED")?._count || 0,
      },
    });
  } catch (error) {
    console.error("Bank messages error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Send a new message or create conversation
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { conversationId, message, subject, recipientId, broadcast } = body;

    if (!message) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 });
    }

    if (broadcast) {
      // Send broadcast message to all users or specific group
      const targetUsers = await prisma.user.findMany({
        where: broadcast.role ? { role: broadcast.role } : {},
        select: { id: true },
      });

      // Create notification for each user
      for (const user of targetUsers) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "SYSTEM",
            title: subject || "Message de l'administration",
            message,
            read: false,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: "BROADCAST_MESSAGE_SENT",
          adminId: access.session.userId,
          details: `Broadcast sent to ${targetUsers.length} users. Subject: ${subject || "N/A"}`,
        },
      });

      return NextResponse.json({
        message: "Message diffuse",
        recipientCount: targetUsers.length,
      });
    }

    if (conversationId) {
      // Reply to existing conversation (add message to ticket)
      const newMessage = await prisma.message.create({
        data: {
          ticketId: conversationId,
          senderId: access.session.userId,
          content: message,
        },
      });

      // Update ticket status
      await prisma.supportTicket.update({
        where: { id: conversationId },
        data: {
          status: "IN_PROGRESS",
        },
      });

      return NextResponse.json({
        message: "Reponse envoyee",
        newMessage,
      });
    }

    // Create new conversation/ticket
    if (!recipientId && !subject) {
      return NextResponse.json({ error: "Destinataire ou sujet requis" }, { status: 400 });
    }

    const newTicket = await prisma.supportTicket.create({
      data: {
        userId: recipientId || access.session.userId,
        subject: subject || "Message de l'administration",
        status: "OPEN",
        priority: "MEDIUM",
        messages: {
          create: {
            senderId: access.session.userId,
            content: message,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Conversation creee",
      conversation: {
        id: newTicket.id,
        subject: newTicket.subject,
        status: newTicket.status,
        createdAt: newTicket.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update conversation status
export async function PUT(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { conversationId, status, priority } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const ticket = await prisma.supportTicket.update({
      where: { id: conversationId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Conversation mise a jour",
      ticket,
    });
  } catch (error) {
    console.error("Update conversation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
