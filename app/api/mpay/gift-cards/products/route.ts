import { NextResponse } from "next/server";
import { getReloadlyToken } from "@/lib/reloadly";

export async function GET() {
  try { const token = await getReloadlyToken(); const response = await fetch("https://giftcards.reloadly.com/products?size=100", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); if (!response.ok) throw new Error("Catalogue Reloadly indisponible"); const products = await response.json(); return NextResponse.json({ products: Array.isArray(products) ? products : products.content ?? [] }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Catalogue indisponible" }, { status: 503 }); }
}

