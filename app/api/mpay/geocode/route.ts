import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await fetch(
      `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=5&accept-language=fr&q=${encodeURIComponent(`${query}, Congo` )}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Pimobipay/1.0 (address search)",
        },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 502 });
    }

    const results = (await response.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;

    return NextResponse.json({
      suggestions: results.map((result) => ({
        id: String(result.place_id),
        label: result.display_name,
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        type: result.type ?? "address",
      })),
    });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
