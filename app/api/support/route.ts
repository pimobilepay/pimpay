import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, userId } = body;

    // 1. Vérification stricte de l'utilisateur
    let finalUserId = null;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) finalUserId = user.id;
    }

    // 2. Si non trouvé par ID, on tente par Email (sécurité PimPay)
    if (!finalUserId && email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: email } });
      if (userByEmail) finalUserId = userByEmail.id;
    }

    // 3. GESTION DU CAS CRITIQUE : Aucun utilisateur trouvé
    // Prisma refusera le ticket si userId n'est pas un ID valide de la table User
    if (!finalUserId) {
      // On cherche le premier ADMIN pour lui assigner le ticket "Guest"
      const firstAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (firstAdmin) {
        finalUserId = firstAdmin.id;
      } else {
        // Si même pas d'admin, on renvoie une erreur 400 propre au lieu d'une 500
        return NextResponse.json(
          { error: "Configuration support requise : aucun administrateur trouvé en base." },
          { status: 400 }
        );
      }
    }

    // 4. Création sécurisée du Ticket + Premier Message
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: finalUserId,
        subject: subject.toUpperCase(),
        status: "OPEN",
        priority: "MEDIUM",
        messages: {
          create: {
            senderId: finalUserId,
            content: `PROVENANCE: ${name.toUpperCase()} (${email})\n\nMESSAGE: ${message}`,
          },
        },
      },
    });

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 });

  } catch (error: any) {
    console.error("PIMPAY_API_ERROR:", error);
    // On renvoie le message d'erreur précis pour le débogage
    return NextResponse.json(
      { error: "Erreur interne du protocole", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [tickets, stats] = await Promise.all([
      prisma.supportTicket.findMany({
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          user: { select: { username: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { _all: true }
      })
    ]);

    const statistics = {
      total: tickets.length,
      open: stats.find(s => s.status === 'OPEN')?._count._all || 0,
      inProgress: stats.find(s => s.status === 'IN_PROGRESS')?._count._all || 0,
      closed: stats.find(s => s.status === 'CLOSED')?._count._all || 0,
    };

    return NextResponse.json({ tickets, statistics });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch error", message: error.message }, { status: 500 });
  }
}
