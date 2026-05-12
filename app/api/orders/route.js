import { NextResponse } from "next/server";
import { cookies } from "next/headers";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req) {
  const token = cookies().get("auth_token")?.value;
  const r = await fetch(`${API_BASE}/orders`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
