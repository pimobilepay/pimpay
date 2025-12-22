import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Schéma de validation
const registerSchema = z.object({
  name: z.string().min(2, "Le nom est trop court"),
  email: z.string().email("Format email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire 6 caractères minimum"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validation des données
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error.errors[0].message 
      }, { status: 400 });
    }

    const { email, password, name } = validation.data;

    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    // ... suite de ta logique de hashage et création ...
    
    return NextResponse.json({ message: "Utilisateur créé" }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
