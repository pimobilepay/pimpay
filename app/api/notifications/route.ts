import { NextRequest, NextResponse } from "next/server";

// Simulation d'une base de données en mémoire
let notifications = [
  {
    id: "1",
    userId: "user_1",
    title: "Dépôt réussi",
    message: "Vous avez reçu 50 USD sur votre wallet",
    type: "success",
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: "2",
    userId: "user_1",
    title: "KYC en cours",
    message: "Votre vérification KYC est en attente",
    type: "info",
    createdAt: new Date().toISOString(),
    read: true,
  },
  {
    id: "3",
    userId: "user_1",
    title: "Erreur de paiement",
    message: "Le paiement de 20 USD a échoué",
    type: "error",
    createdAt: new Date().toISOString(),
    read: false,
  },
];

// ✅ GET notifications
export async function GET(req: NextRequest) {
  // Ici tu peux récupérer l'userId depuis un token ou session
  const userId = "user_1";

  const userNotifications = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(userNotifications);
}

// ✅ POST pour marquer comme lu
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id } = body;

  notifications = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );

  return NextResponse.json({ success: true, id });
}

// ✅ DELETE pour supprimer
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Id requis" }, { status: 400 });
  }

  notifications = notifications.filter((n) => n.id !== id);

  return NextResponse.json({ success: true, id });
}
