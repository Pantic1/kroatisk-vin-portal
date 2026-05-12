
// app/api/login/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req) {
  const body = await req.json();
  // Prox’er til FastAPI
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // hvis FastAPI sætter cookie selv, brug credentials: 'include' + korrekt CORS på backend
  });

  const data = await r.json();
  if (!r.ok) {
    return NextResponse.json({ detail: data?.detail || "Login mislykkedes" }, { status: r.status });
  }

  // Sæt din egen session/JWT-cookie baseret på svaret
  const token = data?.token;
  if (!token) {
    return NextResponse.json({ detail: "Ingen token modtaget" }, { status: 400 });
  }

  cookies().set("auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // hvis cross-site -> "none" + HTTPS
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
