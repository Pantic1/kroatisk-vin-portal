// components/order/OrderDetailClient.js
'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu } from "@headlessui/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const toNumber = (v) => (typeof v === "number" ? v : parseFloat(v)) || 0;

const formatDKK = (n) =>
    Number.isFinite(n)
        ? n.toLocaleString("da-DK", { style: "currency", currency: "DKK" })
        : "";

function fallback(items) {
    return Array.isArray(items) ? items : [];
}

export default function OrderDetailClient({ order }) {
    const [sortKey, setSortKey] = useState("name");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [productsById, setProductsById] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/products/`);
                if (!res.ok) return;

                const list = await res.json();
                const map = {};

                (Array.isArray(list) ? list : []).forEach((p) => {
                    map[p.id] = p;
                });

                setProductsById(map);
            } catch {
                // Bruger fallback-data hvis produkter ikke kan hentes
            }
        })();
    }, []);

    const STATUS_LABELS = {
        PLANNEDPICKUP: "Planlagt afhentning",
        INPICKUP: "Afhentes",
        NOTPICKEDUP: "Ikke afhentet",
        PREADVICE: "Pakkedata modtaget",
        INTRANSIT: "Under transport",
        INDELIVERY: "Ude til levering",
        DELIVEREDPS: "Leveret til pakkeshop",
        DELIVERED: "Leveret",
        INWAREHOUSE: "På lager",
        NOTDELIVERED: "Ikke leveret",
        CANCELED: "Annulleret",
        FINAL: "Afsluttet",
    };

    const fmtDT = (s) => {
        if (!s) return "—";

        try {
            return new Date(s).toLocaleString("da-DK", {
                dateStyle: "medium",
                timeStyle: "short",
            });
        } catch {
            return s;
        }
    };

    const pickLatestParcel = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;

        return [...arr].sort(
            (a, b) =>
                new Date(b?.statusDateTime || 0) -
                new Date(a?.statusDateTime || 0)
        )[0];
    };

    const pickLatestEvent = (events) => {
        if (!Array.isArray(events) || events.length === 0) return null;

        return [...events].sort(
            (a, b) =>
                new Date(b?.eventDateTime || 0) -
                new Date(a?.eventDateTime || 0)
        )[0];
    };

    const fetchTracking = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/gls/track?ref=${encodeURIComponent(order?.tracking_number)}`
            );

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.detail || json?.error || "GLS fejl");
            }

            setData(json);
        } catch (e) {
            setError(e?.message || "Kunne ikke hente GLS-status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (order?.tracking_number) {
            fetchTracking();
        }
    }, [order?.tracking_number]);

    const parcels = data?.parcels || [];

    const itemsRaw = fallback(order?.items);
    const orderId = order?.id || "-";
    const orderDate = order?.order_date ? new Date(order.order_date) : null;
    const status = order?.status || "-";

    const items = useMemo(() => {
        const mapped = itemsRaw.map((it) => {
            const qty = toNumber(it.quantity);
            const price = toNumber(it.price || it.unit_price || it.sale_price);

            const product = productsById[it.product_id] || it.product || {};

            const purchasePrice = toNumber(
                product.purchase_price ||
                it.purchase_price ||
                it.product?.purchase_price
            );

            const name =
                product.name ||
                it.name ||
                it.product_name ||
                it.sku ||
                it.product_id ||
                "Produkt";

            const image =
                product.images?.[0]?.image_url ||
                product.image_url ||
                it.image_url ||
                "/images/products/placeholder.png";

            return {
                id: it.id || `${name}-${it.product_id || Math.random()}`,
                productId: it.product_id || product.id,
                name,
                qty,
                price,
                purchasePrice,
                total: qty * price,
                profit: (price - purchasePrice) * qty,
                image,
                productHref: it.product_id
                    ? `/product-detail/${it.product_id}`
                    : "/product-list",
            };
        });

        return [...mapped].sort((a, b) => {
            if (sortKey === "name") {
                return a.name.localeCompare(b.name, "da");
            }

            if (sortKey === "quantity") {
                return b.qty - a.qty;
            }

            if (sortKey === "price") {
                return b.price - a.price;
            }

            return 0;
        });
    }, [itemsRaw, sortKey, productsById]);

    const subtotalExVat = useMemo(
        () => items.reduce((acc, it) => acc + it.total, 0),
        [items]
    );

    const totalProfit = useMemo(
        () => items.reduce((acc, it) => acc + it.profit, 0),
        [items]
    );

    const vatRate = toNumber(order?.vat_rate) || 0.25;
    const vatAmount = subtotalExVat * vatRate;
    const shipping = toNumber(order?.shipping_total) || 0;
    const grandTotal = subtotalExVat + vatAmount + shipping;

    const shippingAddress = order?.company
        ? `${order.company.address || ""}, ${order.company.zip || ""} ${order.company.city || ""}`
        : "—";

    const paymentMethod = order?.payment_method || "—";

    return (
        <div className="wg-order-detail">
            <div className="left flex-grow">
                <div className="wg-box mb-20">
                    <div className="wg-table table-order-detail">
                        <h5 className="mb-10">
                            Ordre til: {order?.company?.name}
                        </h5>

                        <ul className="table-title flex items-center justify-between gap20 mb-24">
                            <li>
                                <div className="body-title">Alle varer</div>
                            </li>

                            <li>
                                <Menu as="div" className="dropdown default">
                                    <Menu.Button
                                        className="btn btn-secondary dropdown-toggle"
                                        type="button"
                                    >
                                        <span className="body-title-2 flex items-center gap8">
                                            Sortér
                                            <i className="h6 icon-chevron-down" />
                                        </span>
                                    </Menu.Button>

                                    <Menu.Items as="ul" className="dropdown-menu d-block">
                                        <li>
                                            <a onClick={() => setSortKey("name")}>Navn</a>
                                        </li>

                                        <li>
                                            <a onClick={() => setSortKey("quantity")}>Antal</a>
                                        </li>

                                        <li>
                                            <a onClick={() => setSortKey("price")}>Pris</a>
                                        </li>
                                    </Menu.Items>
                                </Menu>
                            </li>
                        </ul>

                        <ul className="flex flex-column">
                            {items.length === 0 && (
                                <li className="product-item gap14">
                                    <div className="body-text">
                                        Ingen varer i denne ordre.
                                    </div>
                                </li>
                            )}

                            {items.map((p) => (
                                <li key={p.id} className="product-item gap14">
                                    <div
                                        className="image no-bg"
                                        style={{
                                            width: 80,
                                            height: 80,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <img
                                            src={p.image}
                                            alt={p.name}
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "100%",
                                                objectFit: "contain",
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap40 flex-grow">
                                        <div className="name">
                                            <div className="text-tiny mb-1">
                                                Produktnavn
                                            </div>

                                            <Link href={p.productHref} className="body-title-2">
                                                {p.name}
                                            </Link>
                                        </div>

                                        <div className="name">
                                            <div className="text-tiny mb-1">Antal</div>

                                            <div className="body-title-2">
                                                {p.qty}
                                            </div>
                                        </div>

                                        <div className="name">
                                            <div className="text-tiny mb-1">Pris</div>

                                            <div className="body-title-2">
                                                {formatDKK(p.price)}
                                            </div>
                                        </div>

                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="wg-box">
                    <div className="wg-table table-cart-totals">
                        <ul className="table-title flex mb-24">
                            <li>
                                <div className="body-title">Kurv totaler</div>
                            </li>

                            <li>
                                <div className="body-title">Pris</div>
                            </li>
                        </ul>

                        <ul className="flex flex-column gap14">
                            <li className="cart-totals-item">
                                <span className="body-text">
                                    Subtotal (uden moms):
                                </span>

                                <span className="body-title-2">
                                    {formatDKK(subtotalExVat)}
                                </span>
                            </li>

                            <li className="divider" />

                            <li className="cart-totals-item">
                                <span className="body-text">Fragt:</span>

                                <span className="body-title-2">
                                    {formatDKK(shipping)}
                                </span>
                            </li>

                            <li className="divider" />

                            <li className="cart-totals-item">
                                <span className="body-text">Moms (25%):</span>

                                <span className="body-title-2">
                                    {formatDKK(vatAmount)}
                                </span>
                            </li>

                            <li className="divider" />

                            <li className="cart-totals-item">
                                <span className="body-title">
                                    Totalpris (inkl. moms):
                                </span>

                                <span className="body-title tf-color-1">
                                    {formatDKK(grandTotal)}
                                </span>
                            </li>

                            <li className="divider" />

                            <li className="cart-totals-item">
                                <span className="body-title">
                                    Hvad har vi tjent:
                                </span>

                                <span className="body-title tf-color-2">
                                    {formatDKK(totalProfit)}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="right">
                <div className="wg-box mb-20 gap10">
                    <div className="body-title">Oversigt</div>

                    <div className="summary-item">
                        <div className="body-text">Ordre ID</div>

                        <div className="body-title-2">#{orderId}</div>
                    </div>

                    <div className="summary-item">
                        <div className="body-text">Dato</div>

                        <div className="body-title-2">
                            {orderDate
                                ? orderDate.toLocaleString("da-DK", {
                                    year: "numeric",
                                    month: "short",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "—"}
                        </div>
                    </div>

                    <div className="summary-item">
                        <div className="body-text">Status</div>

                        <div className="body-title-2 flex items-center gap-3">
                            {status}

                            {status === "review" && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(
                                                `/api/orders/${orderId}/approve`,
                                                {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                    },
                                                }
                                            );

                                            if (!res.ok) {
                                                throw new Error(
                                                    "Kunne ikke godkende ordren"
                                                );
                                            }

                                            alert("Ordren er nu godkendt!");
                                        } catch (err) {
                                            alert("Fejl: " + err.message);
                                        }
                                    }}
                                    className="btn btn-primary text-white px-3 py-1 rounded-md"
                                >
                                    Godkend
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="summary-item">
                        <div className="body-text">Total (uden moms)</div>

                        <div className="body-title-2 tf-color-1">
                            {formatDKK(subtotalExVat)}
                        </div>
                    </div>

                    <div className="summary-item">
                        <div className="body-text">Hvad har vi tjent</div>

                        <div className="body-title-2 tf-color-2">
                            {formatDKK(totalProfit)}
                        </div>
                    </div>
                </div>

                <div className="wg-box mb-20 gap10">
                    <div className="body-title">Leveringsadresse</div>

                    <div className="body-text">{shippingAddress}</div>
                </div>

                <div className="wg-box mb-20 gap10">
                    <div className="body-title">Betalingsmetode</div>

                    <div className="body-text">{paymentMethod}</div>
                </div>

                <div className="wg-box gap10">
                    <div className="mt-3">
                        <div className="body-title">Leveringsstatus (GLS)</div>

                        {loading && (
                            <div className="body-text">
                                Henter GLS-status…
                            </div>
                        )}

                        {error && (
                            <div className="body-text text-red-600">
                                {error}
                            </div>
                        )}

                        {!loading && !error && (() => {
                            const latest = pickLatestParcel(parcels);

                            if (!latest) {
                                return (
                                    <div className="body-text">
                                        Ingen trackingdata.
                                    </div>
                                );
                            }

                            const statusLabel =
                                STATUS_LABELS[latest.status] ||
                                latest.status ||
                                "—";

                            const lastEv = pickLatestEvent(latest.events);

                            return (
                                <div
                                    className="rounded-lg border p-3 mt-2 cursor-pointer select-none"
                                    onClick={() => setExpanded(!expanded)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="body-title-2">
                                            {statusLabel}
                                        </div>

                                        <div className="text-sm text-gray-500">
                                            {expanded ? "▲" : "▼"}
                                        </div>
                                    </div>

                                    {lastEv && !expanded && (
                                        <div className="mt-1 text-sm text-gray-700">
                                            {lastEv.description || lastEv.code}
                                            {" • "}
                                            {fmtDT(lastEv.eventDateTime)}
                                            {lastEv.country
                                                ? ` • ${lastEv.country}`
                                                : ""}
                                        </div>
                                    )}

                                    {expanded && (
                                        <div className="mt-3">
                                            <div className="body-text mb-2">
                                                Historik:
                                            </div>

                                            <ol className="relative border-s pl-3 space-y-2">
                                                {(latest.events || []).map((ev, idx) => (
                                                    <li key={idx} className="ms-2">
                                                        <div className="text-sm font-medium">
                                                            {ev.description || ev.code}
                                                        </div>

                                                        <div className="text-xs text-gray-600">
                                                            {fmtDT(ev.eventDateTime)}
                                                            {ev.country
                                                                ? ` • ${ev.country}`
                                                                : ""}
                                                        </div>

                                                        <hr />
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}