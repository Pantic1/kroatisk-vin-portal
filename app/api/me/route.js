// app/api/me/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export async function GET() {
  const token = cookies().get("auth_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const payload = jwtDecode(token);
    if (payload?.exp && Date.now() / 1000 >= payload.exp) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const id =
      payload.user_id ?? payload.id ?? payload.sub ?? null;

    const name =
      payload.name ??
      ([payload.given_name, payload.family_name].filter(Boolean).join(" ") ||
        payload.username ||
        payload.email ||
        "");

    return NextResponse.json(
      { authenticated: true, id, name, payload },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
