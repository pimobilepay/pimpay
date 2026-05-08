import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// GET - Fetch all bank accounts for a business
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const businessId = decoded.businessId as string;

    // Get all bank accounts for this business
    const accounts = await prisma.businessBankAccount.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    // Get recent statements for all accounts
    const statements = await prisma.businessBankStatement.findMany({
      where: { businessId },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        Account: {
          select: {
            name: true,
            bankName: true,
          },
        },
      },
    });

    // Calculate total balance
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return NextResponse.json({
      accounts,
      statements,
      totalBalance,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des comptes bancaires:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Create a new bank account
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const businessId = decoded.businessId as string;
    const body = await request.json();

    const { bankName, name, number, balance, currency, color } = body;

    if (!bankName || !name || !number) {
      return NextResponse.json(
        { error: "Nom de la banque, nom du compte et numéro requis" },
        { status: 400 }
      );
    }

    const account = await prisma.businessBankAccount.create({
      data: {
        businessId,
        bankName,
        name,
        number,
        balance: balance || 0,
        currency: currency || "XAF",
        color: color || "#6366f1",
        status: "active",
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du compte bancaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT - Update a bank account
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const businessId = decoded.businessId as string;
    const body = await request.json();

    const { id, bankName, name, number, balance, currency, color, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID du compte requis" },
        { status: 400 }
      );
    }

    // Verify the account belongs to this business
    const existingAccount = await prisma.businessBankAccount.findFirst({
      where: { id, businessId },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Compte non trouvé" },
        { status: 404 }
      );
    }

    const account = await prisma.businessBankAccount.update({
      where: { id },
      data: {
        ...(bankName && { bankName }),
        ...(name && { name }),
        ...(number && { number }),
        ...(balance !== undefined && { balance }),
        ...(currency && { currency }),
        ...(color && { color }),
        ...(status && { status }),
        lastSync: new Date(),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du compte bancaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a bank account
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const businessId = decoded.businessId as string;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID du compte requis" },
        { status: 400 }
      );
    }

    // Verify the account belongs to this business
    const existingAccount = await prisma.businessBankAccount.findFirst({
      where: { id, businessId },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Compte non trouvé" },
        { status: 404 }
      );
    }

    await prisma.businessBankAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du compte bancaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
