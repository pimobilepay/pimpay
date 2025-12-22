export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return new Response("Invalid token", { status: 401 });
  }

  const operator = searchParams.get("operator") || "—";
  const phone = searchParams.get("phone") || "—";
  const amount = searchParams.get("amount") || "0";
  const ref = searchParams.get("ref") || "PMP-" + Date.now();

  const qrUrl = `https://pimpay.app/receipt/${ref}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          color: "white",
          padding: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 60, margin: 0 }}>PIMPAY</h1>
          <span style={{ fontSize: 24, opacity: 0.8 }}>Reçu officiel</span>
        </div>

        {/* BODY */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 32 }}>Opérateur : <b>{operator}</b></p>
          <p style={{ fontSize: 32 }}>Téléphone : <b>{phone}</b></p>
          <p style={{ fontSize: 48, color: "#38bdf8" }}>Montant : <b>{amount} π</b></p>
          <p style={{ fontSize: 24, opacity: 0.6 }}>Référence : {ref}</p>
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 20, opacity: 0.5 }}>ISO20022 • Sécurisé par Pimpay</span>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`}
            style={{ width: 120, height: 120 }}
            alt="QR Code"
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
