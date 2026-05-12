// SERVER-ONLY
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export function getUserFromCookie() {
  const token = cookies().get("auth_token")?.value;
  if (!token) return null;

  try {
    const payload = jwtDecode(token);
    if (payload?.exp && Date.now() / 1000 >= payload.exp) return null;

    const id = payload.user_id ?? payload.id ?? payload.sub ?? null;
    console.log("Decoded JWT payload:", payload);
    const name =
      payload.name ??
      ([payload.given_name, payload.family_name].filter(Boolean).join(" ") ||
      payload.username ||
      payload.email ||
      "");

    return { id, name, payload };
  } catch {
    return null;
  }
}
