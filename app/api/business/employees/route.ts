export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

// Helper to verify auth from request
async function verifyAuthFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value || req.cookies.get('pimpay_token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: { 
        id: true, 
        username: true, 
        role: true,
        email: true,
      }
    });

    return user;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

// GET - List all employees for a business
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const business = await prisma.business.findFirst({
      where: { email: session.email },
      include: {
        BusinessEmployee: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Calculate total salary
    const totalSalary = business.BusinessEmployee
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + (e.salary || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        employees: business.BusinessEmployee.map(emp => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          position: emp.position,
          salary: emp.salary,
          isActive: emp.isActive,
          createdAt: emp.createdAt,
          avatar: (emp as any).avatar || null,
          userId: (emp as any).userId || null,
          email: (emp as any).email || null,
          phone: (emp as any).phone || null,
        })),
        stats: {
          total: business.BusinessEmployee.length,
          active: business.BusinessEmployee.filter(e => e.isActive).length,
          totalSalary,
        }
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_EMPLOYEES_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Add a new employee
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, position, salary, email, phone, avatar, userId } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Nom et prenom requis" }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { email: session.email }
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
        position: position || null,
        salary: salary ? parseFloat(salary) : null,
        isActive: true,
        ...(avatar && { avatar }),
        ...(userId && { userId }),
        ...(email && { email }),
        ...(phone && { phone }),
      } as any
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        salary: employee.salary,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        avatar: (employee as any).avatar || null,
        userId: (employee as any).userId || null,
        email: (employee as any).email || null,
        phone: (employee as any).phone || null,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("BUSINESS_EMPLOYEES_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Update an employee
export async function PUT(req: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, firstName, lastName, position, salary, isActive } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "ID employe requis" }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { email: session.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Verify employee belongs to this business
    const existingEmployee = await prisma.businessEmployee.findFirst({
      where: { id: employeeId, businessId: business.id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employe non trouve" }, { status: 404 });
    }

    const employee = await prisma.businessEmployee.update({
      where: { id: employeeId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(position !== undefined && { position }),
        ...(salary !== undefined && { salary: parseFloat(salary) }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        salary: employee.salary,
        isActive: employee.isActive,
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_EMPLOYEES_PUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Remove an employee
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: "ID employe requis" }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { email: session.email }
    });

    if (!business) {
      return NextResponse.json({ error: "Entreprise non trouvee" }, { status: 404 });
    }

    // Verify employee belongs to this business
    const existingEmployee = await prisma.businessEmployee.findFirst({
      where: { id: employeeId, businessId: business.id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employe non trouve" }, { status: 404 });
    }

    await prisma.businessEmployee.delete({
      where: { id: employeeId }
    });

    return NextResponse.json({ success: true, message: "Employe supprime" });

  } catch (error: any) {
    console.error("BUSINESS_EMPLOYEES_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
