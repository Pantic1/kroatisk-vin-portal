// components/order/OrderDetailClient.js
'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from "@headlessui/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const toNumber = (v) => (typeof v === "number" ? v : parseFloat(v)) || 0;

const formatDKK = (n) =>
    Number.isFinite(n)
        ? n.toLocaleString("da-DK", { style: "currency", currency: "DKK" })
        : "";

function CopyField({ label, value }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        if (!value) return
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }
    return (
        <div
            onClick={copy}
            title={value ? 'Klik for at kopiere' : undefined}
            style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                cursor: value ? 'pointer' : 'default',
                padding: '6px 8px', borderRadius: 7,
                transition: 'background .15s',
                background: copied ? '#E5F5E8' : 'transparent',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = copied ? '#E5F5E8' : '#f5f5f5' }}
            onMouseLeave={e => { e.currentTarget.style.background = copied ? '#E5F5E8' : 'transparent' }}
        >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: value ? '#1a1a2e' : '#ccc' }}>{value || '—'}</span>
                {value && (
                    <span style={{ fontSize: 11, color: copied ? '#1A6B2E' : '#bbb', flexShrink: 0 }}>
                        {copied ? '✓ Kopieret' : 'kopier'}
                    </span>
                )}
            </div>
        </div>
    )
}

function fallback(items) {
    return Array.isArray(items) ? items : [];
}

export default function OrderDetailClient({ order }) {
    const router = useRouter();
    const [sortKey, setSortKey] = useState("name");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [productsById, setProductsById] = useState({});

    // ---------- EDIT MODE STATE ----------
    const [editMode, setEditMode]       = useState(false);
    const [draftItems, setDraftItems]   = useState([]);  // {product_id, name, image, quantity, price}
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [saving, setSaving]           = useState(false);
    const [saveError, setSaveError]     = useState(null);

    // Map af firmaets særpriser pr. produkt:
    //   { [product_id]: { special_price, effective_price, has_special } }
    const [companyPricesById, setCompanyPricesById] = useState({});
    const [sellers, setSellers] = useState([]);
    const [sellerSaving, setSellerSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/orders/sellers`)
                if (res.ok) setSellers(await res.json())
            } catch {}
        })()
    }, [])

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

    // Hent firmaets særpriser
    useEffect(() => {
        const companyId = order?.customer_id || order?.company?.id;
        if (!companyId) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/company/${companyId}/prices`);
                if (!res.ok) return;
                const list = await res.json();
                const map = {};
                (Array.isArray(list) ? list : []).forEach((p) => {
                    map[p.product_id] = {
                        special_price:   p.special_price,
                        effective_price: p.effective_price,
                        has_special:     !!p.has_special,
                    };
                });
                setCompanyPricesById(map);
            } catch {
                // Ingen særpris-data - bruger standardpris
            }
        })();
    }, [order?.customer_id, order?.company?.id]);

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

    // ---------- EDIT helpers ----------
    const enterEditMode = () => {
        // Initialiser draft fra de nuværende items
        setDraftItems(items.map(it => ({
            product_id: it.productId,
            name:       it.name,
            image:      it.image,
            quantity:   it.qty,
            price:      it.price,
            purchase_price: it.purchasePrice,
        })));
        setSaveError(null);
        setEditMode(true);
    };

    const cancelEdit = () => {
        setEditMode(false);
        setDraftItems([]);
        setSaveError(null);
    };

    const updateDraftItem = (idx, patch) => {
        setDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
    };

    const removeDraftItem = (idx) => {
        setDraftItems(prev => prev.filter((_, i) => i !== idx));
    };

    const addProductToDraft = (product) => {
        // Brug firmaets særpris hvis den findes - ellers standardpris
        const cp = companyPricesById[product.id];
        const effectivePrice = cp?.has_special
            ? toNumber(cp.effective_price)
            : toNumber(product.sale_price);

        setDraftItems(prev => {
            const existing = prev.findIndex(it => it.product_id === product.id);
            if (existing >= 0) {
                const copy = [...prev];
                copy[existing] = {
                    ...copy[existing],
                    quantity: toNumber(copy[existing].quantity) + (toNumber(product.qty_per_koli) || 12),
                };
                return copy;
            }
            return [...prev, {
                product_id:     product.id,
                name:           product.name,
                image:          product.images?.[0]?.image_url || "/images/products/placeholder.png",
                quantity:       toNumber(product.qty_per_koli) || 12,
                price:          effectivePrice,
                purchase_price: toNumber(product.purchase_price),
            }];
        });
        setShowAddPicker(false);
    };

    const saveEdit = async () => {
        setSaveError(null);
        setSaving(true);
        try {
            const payload = {
                items: draftItems.map(it => ({
                    product_id: it.product_id,
                    quantity:   toNumber(it.quantity),
                    price:      toNumber(it.price),
                })),
            };
            const res = await fetch(`${API_BASE}/orders/${order.id}/items`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Kunne ikke gemme ordren");
            }
            setEditMode(false);
            setDraftItems([]);
            router.refresh();   // hent opdateret ordre fra server
        } catch (e) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // Totaler bruges både i visning og edit-mode
    const displayItems = editMode ? draftItems.map(d => ({
        productId:  d.product_id,
        name:       d.name,
        image:      d.image,
        qty:        toNumber(d.quantity),
        price:      toNumber(d.price),
        purchasePrice: toNumber(d.purchase_price),
        total:      toNumber(d.quantity) * toNumber(d.price),
        profit:     (toNumber(d.price) - toNumber(d.purchase_price)) * toNumber(d.quantity),
    })) : items;

    const subtotalExVat = useMemo(
        () => displayItems.reduce((acc, it) => acc + it.total, 0),
        [displayItems]
    );

    const totalProfit = useMemo(
        () => displayItems.reduce((acc, it) => acc + it.profit, 0),
        [displayItems]
    );

    const isReview = status === "review";
    const productList = Object.values(productsById);

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

                            <li className="flex items-center gap10">
                                {!editMode && (
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
                                            <li><a onClick={() => setSortKey("name")}>Navn</a></li>
                                            <li><a onClick={() => setSortKey("quantity")}>Antal</a></li>
                                            <li><a onClick={() => setSortKey("price")}>Pris</a></li>
                                        </Menu.Items>
                                    </Menu>
                                )}

                                {/* REDIGER / GEM-ANNULLER */}
                                {isReview && !editMode && (
                                    <button
                                        type="button"
                                        onClick={enterEditMode}
                                        className="tf-button style-1"
                                        style={{ padding: "6px 14px" }}
                                    >
                                        <i className="icon-edit-3" /> Rediger
                                    </button>
                                )}
                                {editMode && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="tf-button"
                                            style={{ padding: "6px 14px" }}
                                        >
                                            Annuller
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveEdit}
                                            disabled={saving || draftItems.length === 0}
                                            className="tf-button style-1"
                                            style={{ padding: "6px 14px" }}
                                        >
                                            {saving ? "Gemmer…" : "Gem ændringer"}
                                        </button>
                                    </>
                                )}
                            </li>
                        </ul>

                        {saveError && (
                            <div style={{ color: "red", marginBottom: 10 }}>{saveError}</div>
                        )}

                        {/* ITEMS LIST - vis-mode eller rediger-mode */}
                        {!editMode ? (
                            <ul className="flex flex-column">
                                {items.length === 0 && (
                                    <li className="product-item gap14">
                                        <div className="body-text">Ingen varer i denne ordre.</div>
                                    </li>
                                )}
                                {items.map((p) => (
                                    <li key={p.id} className="product-item gap14">
                                        <div className="image no-bg" style={imageBoxStyle}>
                                            <img src={p.image} alt={p.name} style={imageStyle} />
                                        </div>
                                        <div className="flex items-center justify-between gap40 flex-grow">
                                            <div className="name">
                                                <div className="text-tiny mb-1">Produktnavn</div>
                                                <Link href={p.productHref} className="body-title-2">{p.name}</Link>
                                            </div>
                                            <div className="name">
                                                <div className="text-tiny mb-1">Antal</div>
                                                <div className="body-title-2">{p.qty}</div>
                                            </div>
                                            <div className="name">
                                                <div className="text-tiny mb-1">Pris</div>
                                                <div className="body-title-2">{formatDKK(p.price)}</div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <>
                                <ul className="flex flex-column">
                                    {draftItems.length === 0 && (
                                        <li className="product-item gap14">
                                            <div className="body-text">Ingen varer - tilføj et produkt nedenfor.</div>
                                        </li>
                                    )}
                                    {draftItems.map((d, idx) => (
                                        <li
                                            key={d.product_id + '-' + idx}
                                            style={editRowStyle}
                                        >
                                            <div style={imageBoxStyle}>
                                                <img src={d.image} alt={d.name} style={imageStyle} />
                                            </div>

                                            {/* Produktnavn - shrinker hvis nødvendigt */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={editLabelStyle}>Produktnavn</div>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                    title={d.name}
                                                >
                                                    {d.name}
                                                </div>
                                            </div>

                                            {/* Antal */}
                                            <div style={editColStyle}>
                                                <div style={editLabelStyle}>Antal</div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={d.quantity}
                                                    onChange={(e) => updateDraftItem(idx, { quantity: e.target.value })}
                                                    style={editInputStyle(80)}
                                                />
                                            </div>

                                            {/* Pris */}
                                            <div style={editColStyle}>
                                                <div style={editLabelStyle}>Pris pr. stk</div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={d.price}
                                                    onChange={(e) => updateDraftItem(idx, { price: e.target.value })}
                                                    style={editInputStyle(100)}
                                                />
                                            </div>

                                            {/* Linjetotal */}
                                            <div style={editColStyle}>
                                                <div style={editLabelStyle}>Linjetotal</div>
                                                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
                                                    {formatDKK(toNumber(d.quantity) * toNumber(d.price))}
                                                </div>
                                            </div>

                                            {/* Fjern-knap */}
                                            <button
                                                type="button"
                                                onClick={() => removeDraftItem(idx)}
                                                title="Fjern linje"
                                                style={removeBtnStyle}
                                            >
                                                <i className="icon-trash-2" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div style={{ marginTop: 16 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPicker(true)}
                                        className="tf-button"
                                        style={{ padding: "8px 18px" }}
                                    >
                                        <i className="icon-plus" /> Tilføj produkt
                                    </button>
                                </div>
                            </>
                        )}
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

                            {isReview && !editMode && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(
                                                `/api/orders/${orderId}/approve`,
                                                {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                }
                                            );
                                            if (!res.ok) throw new Error("Kunne ikke godkende ordren");
                                            alert("Ordren er nu godkendt!");
                                            router.refresh();
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
                        <div className="body-text">Sælger</div>
                        <div className="body-title-2">
                            {order?.seller?.username || '—'}
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

                <div className="wg-box mb-20" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="body-title" style={{ marginBottom: 4 }}>Faktura info</div>
                    {[
                        { label: 'Firmanavn', value: order?.company?.name },
                        { label: 'CVR',       value: order?.company?.cvr },
                        { label: 'Adresse',   value: shippingAddress },
                        { label: 'Mail til faktura', value: order?.company?.email },
                    ].map(({ label, value }) => (
                        <CopyField key={label} label={label} value={value} />
                    ))}
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

            {/* ADD-PRODUKT MODAL */}
            {showAddPicker && (
                <AddProductPicker
                    products={productList}
                    companyPrices={companyPricesById}
                    onClose={() => setShowAddPicker(false)}
                    onPick={addProductToDraft}
                />
            )}
        </div>
    );
}

// ===================================================================
// PRODUKT-PICKER MODAL
// ===================================================================
function AddProductPicker({ products, companyPrices = {}, onClose, onPick }) {
    const [query, setQuery] = useState("");
    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return (products || []).filter(p =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.sku  || "").toLowerCase().includes(q)
        );
    }, [products, query]);

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="wg-box"
                style={{ width: "min(640px,92vw)", maxHeight: "85vh", overflow: "auto", background: "#fff" }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h5 style={{ marginBottom: 0 }}>Tilføj produkt</h5>
                    <button type="button" onClick={onClose} className="item" title="Luk">
                        <i className="icon-x" />
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Søg navn eller SKU..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        width: "100%", padding: "8px 12px",
                        border: "1px solid #ddd", borderRadius: 6, marginBottom: 12,
                    }}
                    autoFocus
                />

                <div style={{ border: "1px solid #eee", borderRadius: 6, maxHeight: 360, overflowY: "auto" }}>
                    {filtered.length === 0 && (
                        <div style={{ padding: 16 }} className="body-text">
                            Ingen produkter matcher.
                        </div>
                    )}
                    {filtered.map(p => {
                        const cp = companyPrices[p.id];
                        const hasSpecial = !!cp?.has_special;
                        const effective  = hasSpecial ? toNumber(cp.effective_price) : toNumber(p.sale_price);
                        return (
                            <div
                                key={p.id}
                                onClick={() => onPick(p)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: 10, cursor: "pointer",
                                    borderBottom: "1px solid #f3f3f3",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#f7faff"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                            >
                                <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", borderRadius: 6, flexShrink: 0 }}>
                                    <img
                                        src={p.images?.[0]?.image_url || "/images/products/placeholder.png"}
                                        alt={p.name}
                                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="body-title-2">{p.name}</div>
                                    <div style={{ fontSize: 11, color: "#888" }}>
                                        SKU: {p.sku} · Lager: {p.stock_quantity} stk
                                        {p.qty_per_koli ? ` · 1 koli = ${p.qty_per_koli} stk` : ""}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    {hasSpecial ? (
                                        <>
                                            <div className="body-title-2" style={{ color: "#1A6B2E" }}>
                                                {formatDKK(effective)}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#888", textDecoration: "line-through" }}>
                                                {formatDKK(p.sale_price)}
                                            </div>
                                            <span style={{
                                                display: "inline-block", marginTop: 2,
                                                fontSize: 10, padding: "1px 6px",
                                                borderRadius: 4, background: "#E5F5E8", color: "#0e7a2b",
                                                fontWeight: 600,
                                            }}>
                                                SÆRPRIS
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="body-title-2">{formatDKK(p.sale_price)}</div>
                                            <div style={{ fontSize: 11, color: "#888" }}>pr. stk</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="body-text" style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
                    Klik på et produkt for at tilføje 1 koli til ordren. Du kan justere antal og pris bagefter.
                </div>
            </div>
        </div>
    );
}

// ===================================================================
// STYLES
// ===================================================================
const imageBoxStyle = {
    width: 80, height: 80, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
};
const imageStyle = {
    maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
};
const editInputStyle = (w) => ({
    width: w, padding: "6px 10px",
    border: "1px solid #ddd", borderRadius: 6,
    fontSize: 14, fontWeight: 600,
    boxSizing: "border-box",
});
const removeBtnStyle = {
    background: "#FFE5E5", color: "#A8001A",
    border: "none", width: 36, height: 36, flexShrink: 0,
    borderRadius: 6, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
};

// Edit-mode række layout (uden template-CSS der overlapper)
const editRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 0",
    borderBottom: "1px solid #f0f0f0",
};
const editColStyle = {
    flexShrink: 0,        // labels og inputs skal ALDRIG presses sammen
    display: "flex",
    flexDirection: "column",
    gap: 4,
};
const editLabelStyle = {
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
};