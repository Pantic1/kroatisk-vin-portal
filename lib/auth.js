// app/(protected)/layout.jsx   (SERVER COMPONENT – ingen "use client")
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import Layout from "@/components/layout/Layout";

export default async function ProtectedLayout({ children }) {
  const user = getUserFromCookie();  // OK her: server-only
  console.log("ProtectedLayout user1:", user);
  if (!user) redirect("/login");
  return <Layout user={user}>{children}</Layout>;
}
