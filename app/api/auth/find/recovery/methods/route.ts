export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// --- SÉCURITÉ : MASQUAGE STRICT ---
// On ne renvoie JAMAIS les données réelles en clair car l'API est publique
const maskEmail = (email: string | null) => {
    if (!email) return null;
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.substring(0, 2)}****@${domain}`;
};

const maskPhone = (phone: string | null) => {
    if (!phone) return null;
    // Masque tout sauf les 4 premiers et 2 derniers chiffres
    return `${phone.substring(0, 4)}••••${phone.slice(-2)}`;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("username")?.trim();

        if (!query) {
            return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
        }

        // Nettoyage de l'identifiant (casse et symboles)
        const cleanQuery = query.toLowerCase().replace('@', '');

        // --- ACCÈS À LA BASE DE DONNÉES (SANS COOKIE) ---
        // Ici, on autorise l'accès car on ne renvoie que des infos masquées
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: cleanQuery, mode: 'insensitive' } },
                    { email: { equals: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                status: true
            }
        });

        // 1. Si l'utilisateur n'existe pas
        if (!user) {
            return NextResponse.json(
                { error: "Cet identifiant n'existe pas sur PimPay" },
                { status: 404 }
            );
        }

        // 2. Si le compte est bloqué (Sécurité bancaire)
        if (user.status === "BANNED" || user.status === "FROZEN") {
            return NextResponse.json(
                { error: "Ce compte fait l'objet d'une restriction de sécurité" },
                { status: 403 }
            );
        }

        // 3. Réponse avec données masquées uniquement
        return NextResponse.json({
            success: true,
            data: {
                // On ne renvoie jamais user.email directement, seulement la version masquée
                email: maskEmail(user.email),
                phone: maskPhone(user.phone)
            }
        });

    } catch (error: any) {
        console.error("DATABASE_CONNECTION_ERROR:", error.message);
        return NextResponse.json(
            { error: "Le bouclier GCV Shield est temporairement indisponible" },
            { status: 500 }
        );
    }
}
