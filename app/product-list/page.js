'use client'

import Layout from "@/components/layout/Layout"
import Link from "next/link"
import { useEffect, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export default function ProductList() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch(API_BASE + "/products/");
                const data = await res.json();
                setProducts(data);
            } catch (err) {
                console.error("Fejl ved hentning af produkter:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // ✅ Slet funktion
    const deleteProduct = async (id) => {
        if (!confirm("Er du sikker på, at du vil slette dette produkt?")) return;

        try {
            const res = await fetch(`${API_BASE}/products/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Kunne ikke slette produktet");
            }

            // Fjern fra state uden reload
            setProducts((prev) => prev.filter((p) => p.id !== id));

        } catch (err) {
            console.error("Fejl ved sletning af produkt:", err);
            alert("Der opstod en fejl under sletningen.");
        }
    };

    return (
        <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Produktliste">
            <div className="wg-box">
                <div className="flex items-center justify-between gap10 flex-wrap">
                    <div className="wg-filter flex-grow">
                        <form
                            className="form-search"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <fieldset className="name">
                                <input
                                    type="text"
                                    placeholder="Søg her..."
                                    name="name"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </fieldset>
                            <div className="button-submit">
                                <button type="submit"><i className="icon-search" /></button>
                            </div>
                        </form>
                    </div>
                    <Link className="tf-button style-1 w208" href="/add-product">
                        <i className="icon-plus" />Tilføj ny
                    </Link>
                </div>

                <div className="wg-table table-product-list">
                    <ul className="table-title flex gap40 mb-14">
                        <li><div className="body-title">Produkt</div></li>
                        <li><div className="body-title">Produkt ID</div></li>
                        <li><div className="body-title">Pris</div></li>
                        <li><div className="body-title">Antal</div></li>
                        <li><div className="body-title">Lager</div></li>
                        <li><div className="body-title">Handling</div></li>
                    </ul>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '12px 0', borderBottom: '1px solid #f0f0f0',
                                }}>
                                    <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ height: 14, width: '50%', borderRadius: 6, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                        <div style={{ height: 11, width: '30%', borderRadius: 6, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    </div>
                                    <div style={{ height: 14, width: 60, borderRadius: 6, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                </div>
                            ))}
                            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
                        </div>
                    ) : null}

                    <ul className="flex flex-column">
                        {!loading && products
                            ?.filter((product) =>
                                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                product.sku.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((product) => (
                                <li className="product-item gap14" key={product.id}>
                                    <div className="image no-bg">
                                        <img
                                            style={{ height: '60px' }}
                                            src={product.images?.[0]?.image_url || "/images/products/placeholder.png"}
                                            alt={product.name}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap40 flex-grow">
                                        <div className="name">
                                            <Link href={`/product-detail/${product.id}`} className="body-title-2">
                                                {product.name}
                                            </Link>
                                        </div>
                                        <div className="body-text">#{product.sku}</div>
                                        <div className="body-text">{product.sale_price} DKK</div>
                                        <div className="body-text">{product.stock_quantity} Stk / {(product.stock_quantity / product.qty_per_koli).toFixed(0)} kolis
                                            <br></br>
                                            <span style={{ fontSize: '12px', color: 'gray' }}>({product.qty_per_koli} stk/koli)</span>
                                        </div>
                                        <div>
                                            {product.stock_quantity > 0 ? (
                                                <div className="block-available">På lager</div>
                                            ) : (
                                                <div className="block-not-available">Udsolgt</div>
                                            )}
                                        </div>
                                        <div className="list-icon-function">
                                            <Link href={`/product-detail/${product.id}`} className="body-title-2">
                                                <div className="item eye"><i className="icon-eye" /></div>
                                            </Link>
                                            <Link href={`/edit-product/${product.id}`} className="body-title-2">
                                                <div className="item edit"><i className="icon-edit-3" /></div>
                                            </Link>
                                            <div
                                                className="item trash"
                                                onClick={() => deleteProduct(product.id)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <i className="icon-trash-2" />
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
        </Layout>
    )
}
