import { redirect } from "next/navigation";
import { getUserFromCookie } from "../../lib/auth-server";   // RELATIV sti
import Layout from "../../components/layout/Layout";          // RELATIV sti

export default async function ProtectedLayout({ children }) {
  const user = getUserFromCookie();
  // Debug i terminalen:
  console.log("[server] ProtectedLayout user:", user?.name, user?.id);

  if (!user) redirect("/login?from=/protected");
  return <Layout user={user}>{children}</Layout>;
}
