export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - List all invoices for a business
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    const business = await prisma.business.findFirst({
      where: { email: user?.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    const whereClause: any = { businessId: business.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const totalCount = await prisma.businessInvoice.count({ where: whereClause });

    const invoices = await prisma.businessInvoice.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Calculate totals
    const allInvoices = await prisma.businessInvoice.findMany({
      where: { businessId: business.id }
    });

    const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidAmount = allInvoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.total, 0);
    const pendingAmount = allInvoices
      .filter(inv => inv.status === 'PENDING' || inv.status === 'DRAFT')
      .reduce((sum, inv) => sum + inv.total, 0);

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          total: inv.total,
          status: inv.status,
          createdAt: inv.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          totalInvoices: allInvoices.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paidAmount: Math.round(paidAmount * 100) / 100,
          pendingAmount: Math.round(pendingAmount * 100) / 100,
        }
      }
    });

  } catch (error: unknown) {
    console.error("BUSINESS_INVOICES_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new invoice
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { customerName, total, status = "DRAFT", items } = body;

    if (!customerName || !total) {
      return NextResponse.json({ error: "Nom du client et montant requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    const business = await prisma.business.findFirst({
      where: { email: user?.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Generate invoice number
    const invoiceCount = await prisma.businessInvoice.count({
      where: { businessId: business.id }
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = await prisma.businessInvoice.create({
      data: {
        id: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        invoiceNumber,
        businessId: business.id,
        customerName,
        total: parseFloat(total),
        status,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        total: invoice.total,
        status: invoice.status,
        createdAt: invoice.createdAt,
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("BUSINESS_INVOICES_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update invoice status
export async function PUT(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { invoiceId, status, customerName, total } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "ID facture requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    const business = await prisma.business.findFirst({
      where: { email: user?.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Verify invoice belongs to this business
    const existingInvoice = await prisma.businessInvoice.findFirst({
      where: { id: invoiceId, businessId: business.id }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Facture non trouvee" }, { status: 404 });
    }

    const invoice = await prisma.businessInvoice.update({
      where: { id: invoiceId },
      data: {
        ...(status && { status }),
        ...(customerName && { customerName }),
        ...(total && { total: parseFloat(total) }),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        total: invoice.total,
        status: invoice.status,
      }
    });

  } catch (error: unknown) {
    console.error("BUSINESS_INVOICES_PUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Delete an invoice
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: "ID facture requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true }
    });

    const business = await prisma.business.findFirst({
      where: { email: user?.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Verify invoice belongs to this business
    const existingInvoice = await prisma.businessInvoice.findFirst({
      where: { id: invoiceId, businessId: business.id }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Facture non trouvee" }, { status: 404 });
    }

    await prisma.businessInvoice.delete({
      where: { id: invoiceId }
    });

    return NextResponse.json({ success: true, message: "Facture supprimee" });

  } catch (error: unknown) {
    console.error("BUSINESS_INVOICES_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
