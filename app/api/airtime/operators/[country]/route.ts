// app/api/airtime/operators/[country]/route.ts

import { getReloadlyToken } from "@/lib/reloadly";
import { NextResponse } from "next/server";

export async function GET(req, { params }: any) {
  const { country } = params;
  const token = await getReloadlyToken();

  const res = await fetch(
    `https://topups.reloadly.com/operators/countries/${country}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
