export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("pi_session_token")?.value; // Ton vaccin
  const { walletAddress } = await req.json();

  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { walletAddress: walletAddress }
  });

  return NextResponse.json({ success: true });
}
