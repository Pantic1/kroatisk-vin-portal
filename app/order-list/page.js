// app/oder-list/page.js  (server component)
import Link from "next/link";
import { cookies } from "next/headers";
import Layout from "@/components/layout/Layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Farveskema pr. ordrestatus (matcher DB-enum)
const STATUS_STYLES = {
  pending:   { bg: "#FFF4E5", fg: "#A86600", label: "Afventer" },
  review:    { bg: "#E5F0FF", fg: "#0846A8", label: "Til gennemsyn" },
  confirmed: { bg: "#E5F5E8", fg: "#1A6B2E", label: "Godkendt" },
  shipped:   { bg: "#EFE5FF", fg: "#5B21B6", label: "Afsendt" },
  delivered: { bg: "#D1FADF", fg: "#054F31", label: "Leveret" },
  cancelled: { bg: "#FFE5E5", fg: "#A8001A", label: "Annulleret" },
};

const statusPillStyle = (s) => {
  const conf = STATUS_STYLES[(s || "").toLowerCase()] || { bg: "#EEE", fg: "#444" };
  return {
    background:    conf.bg,
    color:         conf.fg,
    padding:       "4px 12px",
    borderRadius:  12,
    fontSize:      12,
    fontWeight:    600,
    textTransform: "capitalize",
    display:       "inline-block",
    whiteSpace:    "nowrap",
  };
};

const statusLabel = (s) =>
  STATUS_STYLES[(s || "").toLowerCase()]?.label || s || "—";

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

export default async function OderList() {
  const orders = await getOrders();

  const formatDKK = (n) =>
    Number.isFinite(+n)
      ? Number(n).toLocaleString("da-DK", { style: "currency", currency: "DKK" })
      : n ?? "—";

  return (
    <Layout breadcrumbTitleParent="Order" breadcrumbTitle="Order List">
      <div className="wg-box">
        <div className="flex items-center justify-between gap10 flex-wrap">
          <div className="wg-filter flex-grow" />
          <Link className="tf-button style-1 w208" href="/oder-detail">
            <i className="icon-file-text" />
            Export all order
          </Link>
        </div>

        <div className="wg-table table-all-category">
          <ul className="table-title flex mb-14">
            <li><div className="body-title">Kunde</div></li>
            <li><div className="body-title">Order ID</div></li>
            <li><div className="body-title">Total ex moms</div></li>
            <li><div className="body-title">Antal</div></li>
            <li><div className="body-title">Betalt</div></li>
            <li><div className="body-title">Status</div></li>
            <li><div className="body-title">Action</div></li>
          </ul>

          <ul className="flex flex-column">
            {orders.length === 0 && (
              <li className="product-item">
                <div className="flex items-center justify-center w-full py-8 body-text">
                  Ingen ordrer fundet.
                </div>
              </li>
            )}

            {orders.map((o) => {
              const id = o?.order_id;
              const customerName =o?.company.name;
              const totalPrice = o?.subtotal_price;
              const qty =
                o?.items_count ??
                o?.quantity ??
                (Array.isArray(o?.items) ? o.items.reduce((n, it) => n + (it.quantity || 0), 0) : 0);
              const payment = o?.payment_status || o?.payment?.status || "—";
              const status = o?.status;
              const tracking = o?.tracking_number || o?.tracking || "—";

              return (
                <li key={id} className="product-item gap14">

                  <div className="flex items-center justify-between gap20 flex-grow">
                    <div className="name">
                      <Link href={`/order-detail/`+ o?.id} className="body-title-2">
                        {customerName}
                      </Link>
                    </div>
                    <div className="body-text">#{id}</div>
                    <div className="body-text">{formatDKK(totalPrice)}</div>
                    <div className="body-text">{qty}</div>
                    <div className="body-text">{payment}</div>
                    <div>
                      <span style={statusPillStyle(status)}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <div className="list-icon-function">
                      <Link href={`/order-detail/`+ o?.id} className="item eye" title="View">
                        <i className="icon-eye" />
                      </Link>
                      <Link href={`/create-order/${id}`} className="item edit" title="Edit">
                        <i className="icon-edit-3" />
                      </Link>
                      <button className="item trash" title="Delete" disabled>
                        <i className="icon-trash-2" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="divider" />
      </div>
    </Layout>
  );
}
