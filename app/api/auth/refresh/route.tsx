import { cookies } from "next/headers";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = cookies().get("refresh_token")?.value;
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  try {
    const payload = verifyRefreshToken(token) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.refreshToken !== token) {
      return Response.json({ error: "Invalid token" }, { status: 403 });
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    return Response.json({ accessToken });
  } catch {
    return Response.json({ error: "Expired token" }, { status: 403 });
  }
}
