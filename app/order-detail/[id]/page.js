// app/oder-detail/[id]/page.js
import Layout from "@/components/layout/Layout";
import { cookies } from "next/headers";
import OrderDetailClient from "@/components/order/orderDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function getOrder(id) {
  const token = cookies().get("auth_token")?.value;

  try {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      // 404 eller andet -> returnér null så vi kan vise tom tilstand
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Fejl ved hentning af ordre:", err);
    return null;
  }
}

export default async function Page({ params }) {
  const { id } = params || {};
  const order = id ? await getOrder(id) : null;

  return (
    <Layout breadcrumbTitleParent="Order" breadcrumbTitle="Order detail">
      <OrderDetailClient order={order} />
    </Layout>
  );
}
