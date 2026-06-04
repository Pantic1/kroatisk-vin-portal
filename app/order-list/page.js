// app/order-list/page.js  (server component)
import { cookies } from "next/headers";
import Layout from "@/components/layout/Layout";
import OrderListClient from "./OrderListClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Hent alle ordrer (ingen page/search)
async function getOrders() {
  const token = cookies().get("auth_token")?.value;

  const res = await fetch(`${API_BASE}/orders`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  console.log("Fetched orders:", data);
  // Understøt både array og { items: [...] }
  return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
}

export default async function OrderList() {
  const orders = await getOrders();

  return (
    <Layout breadcrumbTitleParent="Order" breadcrumbTitle="Order List">
      <div className="wg-box">
        <OrderListClient orders={orders} />
      </div>
    </Layout>
  );
}
