'use client'

import Layout from "@/components/layout/Layout"
import Link from "next/link"
import { useState } from "react"
const API_BASE = process.env.NEXT_PUBLIC_API_URL

export default function AddProduct() {
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        purchasePrice: '',
        salePrice: '',
        stock: '',
        qtyPerKoli: '',
    });

    const [imageFiles, setImageFiles] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setImageFiles(files); // optional – for preview later
        setUploading(true);

        try {
            const urls = [];

            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(API_BASE + "/uploads/upload/", {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) throw new Error("Billedupload fejlede");

                const data = await res.json();
                urls.push(data.url);
            }

            setImageUrls(urls); // gem URL’er til brug ved submit
        } catch (error) {
            console.error(error);
            alert("Fejl under billedupload");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                sku: formData.sku,
                name: formData.name,
                description: formData.description,
                purchase_price: parseFloat(formData.purchasePrice),
                sale_price: parseFloat(formData.salePrice),
                stock_quantity: parseInt(formData.stock),
                qty_per_koli: formData.qtyPerKoli ? parseInt(formData.qtyPerKoli) : null,
                unit: "stk",
                images: imageUrls.map(url => ({ image_url: url }))
            };

            const res = await fetch(API_BASE + "/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                alert("Fejl: " + error.detail);
                return;
            }

            const data = await res.json();
            alert("✅ Produkt oprettet: " + data.name);
        } catch (err) {
            console.error(err);
            alert("Der opstod en fejl under oprettelse.");
        }
    };

    return (
        <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Tilføj produkt">
            <form className="tf-section-2 form-add-product" onSubmit={handleSubmit}>
                <div className="wg-box">
                    {/* SKU */}
                    <fieldset className="sku">
                        <div className="body-title mb-10">SKU <span className="tf-color-1">*</span></div>
                        <input className="mb-10" type="text" placeholder="Indtast produkt SKU" name="sku" value={formData.sku} onChange={handleChange} required />
                    </fieldset>

                    {/* Navn */}
                    <fieldset className="name">
                        <div className="body-title mb-10">Produktnavn <span className="tf-color-1">*</span></div>
                        <input className="mb-10" type="text" placeholder="Indtast produktnavn" name="name" value={formData.name} onChange={handleChange} required />
                    </fieldset>

                    {/* Priser */}
                    <div className="gap22 cols">
                        <fieldset className="purchase-price">
                            <div className="body-title mb-10">Indkøbspris (DKK)</div>
                            <input type="number" step="0.01" placeholder="F.eks. 50.00" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} required />
                        </fieldset>
                        <fieldset className="sale-price">
                            <div className="body-title mb-10">Salgspris (DKK)</div>
                            <input type="number" step="0.01" placeholder="F.eks. 99.00" name="salePrice" value={formData.salePrice} onChange={handleChange} required />
                        </fieldset>
                    </div>

                    {/* Lager + koli */}
                    <div className="gap22 cols">
                        <fieldset className="stock">
                            <div className="body-title mb-10">Antal på lager</div>
                            <input type="number" placeholder="F.eks. 100" name="stock" value={formData.stock} onChange={handleChange} required />
                        </fieldset>
                        <fieldset className="qty-per-koli">
                            <div className="body-title mb-10">Antal pr. koli</div>
                            <input type="number" min="1" step="1" placeholder="F.eks. 12" name="qtyPerKoli" value={formData.qtyPerKoli} onChange={handleChange} />
                        </fieldset>
                    </div>

                    {/* Beskrivelse */}
                    <fieldset className="description">
                        <div className="body-title mb-10">Beskrivelse</div>
                        <textarea className="mb-10" name="description" placeholder="Beskriv produktet..." value={formData.description} onChange={handleChange} required />
                    </fieldset>
                </div>

                <div className="wg-box">

                    <fieldset>
                        <div className="body-title mb-10">Upload images</div>
                        <div className="upload-image mb-16">
                            {/* Allerede uploadede billeder */}
                            {imageUrls.map((url, idx) => (
                                <div className="item" key={idx}>
                                    <img src={url} alt={`Produkt billede ${idx + 1}`} />
                                </div>
                            ))}

                            {/* Upload-knap */}
                            <div className="item up-load">
                                <label className="uploadfile" htmlFor="productImages">
                                    <span className="icon">
                                        <i className="icon-upload-cloud" />
                                    </span>
                                    <span className="text-tiny">
                                        Drop dine billeder her eller <span className="tf-color">klik for at vælge</span>
                                    </span>
                                    <input
                                        type="file"
                                        id="productImages"
                                        name="images"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                        </div>

                        {uploading && <div className="body-text mt-2">Uploader billeder...</div>}

                        <div className="body-text">
                            Du skal tilføje mindst 1 billede. Brug høj kvalitet og vis alle produktdetaljer tydeligt.
                        </div>
                    </fieldset>


                    <div className="cols gap10 mt-20">
                        <button className="tf-button w-full" type="submit">Tilføj produkt</button>
                    </div>
                </div>
            </form>
        </Layout >
    );
}
