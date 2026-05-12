// app/api/orders/[id]/dinero/route.js
import { cookies } from "next/headers";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: "Mangler ordre-id" }, { status: 400 });

  const token = cookies().get("auth_token")?.value;
  const res = await fetch(`${API_BASE}/orders/${id}/dinero?book=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json({ error: data?.detail || "Dinero-fejl" }, { status: res.status });
  }
  return Response.json(data, { status: 200 });
}
