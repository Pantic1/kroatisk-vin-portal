import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL; // fx https://api.example.com

export async function POST(_req, { params }) {
  const id = params?.id;
  if (!id) {
    return Response.json({ error: "Mangler ordre-id" }, { status: 400 });
  }

  try {
    const token = cookies().get("auth_token")?.value;

    const res = await fetch(`${API_BASE}/orders/${id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.detail || data?.error || "Kunne ikke godkende ordre";
      return Response.json({ error: msg }, { status: res.status || 500 });
    }

    return Response.json({ ok: true, order: data.order, gls: data.gls }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || "Serverfejl" }, { status: 500 });
  }
}
