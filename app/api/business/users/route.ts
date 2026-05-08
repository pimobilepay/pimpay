export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - List all employees/users for a business
export async function GET(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const role = searchParams.get('role');
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

    // Build where clause
    const whereClause: any = { businessId: business.id };
    
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'suspended') {
      whereClause.isActive = false;
    }

    if (role) {
      whereClause.position = role;
    }

    const totalCount = await prisma.businessEmployee.count({ where: whereClause });

    const employees = await prisma.businessEmployee.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get all employees for stats
    const allEmployees = await prisma.businessEmployee.findMany({
      where: { businessId: business.id }
    });

    // Calculate role counts
    const roleCounts = {
      admin: allEmployees.filter(e => e.position?.toLowerCase() === 'admin' || e.position?.toLowerCase() === 'administrateur').length,
      manager: allEmployees.filter(e => e.position?.toLowerCase() === 'manager').length,
      accountant: allEmployees.filter(e => e.position?.toLowerCase() === 'comptable' || e.position?.toLowerCase() === 'accountant').length,
    };

    const statusCounts = {
      active: allEmployees.filter(e => e.isActive).length,
      suspended: allEmployees.filter(e => !e.isActive).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        users: employees.map(emp => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email || '',
          phone: emp.phone || '',
          role: emp.position?.toLowerCase() || 'employee',
          department: emp.position || 'General',
          status: emp.isActive ? 'active' : 'suspended',
          avatar: `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase(),
          lastLogin: emp.updatedAt?.toISOString() || '',
          createdAt: emp.createdAt,
          salary: emp.salary,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          totalUsers: allEmployees.length,
          roleCounts,
          statusCounts,
        }
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_USERS_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new employee/user
export async function POST(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, position, salary } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Prenom et nom requis" }, { status: 400 });
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

    const employee = await prisma.businessEmployee.create({
      data: {
        id: `EMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        businessId: business.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        position: position || 'Employee',
        salary: salary ? parseFloat(salary) : null,
        isActive: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: employee.position?.toLowerCase() || 'employee',
        status: 'active',
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("BUSINESS_USERS_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update employee/user
export async function PUT(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, firstName, lastName, email, phone, position, salary, status } = body;

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
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

    // Verify employee belongs to this business
    const existingEmployee = await prisma.businessEmployee.findFirst({
      where: { id: userId, businessId: business.id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    const employee = await prisma.businessEmployee.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(position && { position }),
        ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
        ...(status && { isActive: status === 'active' }),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: employee.position?.toLowerCase() || 'employee',
        status: employee.isActive ? 'active' : 'suspended',
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_USERS_PUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Delete an employee/user
export async function DELETE(req: Request) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
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

    // Verify employee belongs to this business
    const existingEmployee = await prisma.businessEmployee.findFirst({
      where: { id: userId, businessId: business.id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    await prisma.businessEmployee.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true, message: "Utilisateur supprime" });

  } catch (error: any) {
    console.error("BUSINESS_USERS_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
