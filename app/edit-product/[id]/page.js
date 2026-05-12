'use client'

import Layout from "@/components/layout/Layout"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export default function EditProduct() {
  const { id } = useParams()
  const router = useRouter()

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    purchasePrice: '',
    qty_per_koli: '',
    salePrice: '',
    stock: '',
  })

  const [imageUrls, setImageUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Hent eksisterende produkt
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/products/${id}`)
        if (!res.ok) throw new Error('Kunne ikke hente produktet')
        const data = await res.json()

        setFormData({
          sku: data.sku || '',
          name: data.name || '',
          description: data.description || '',
          purchasePrice: (data.purchase_price ?? '').toString(),
          qty_per_koli: (data.qty_per_koli ?? '').toString(),
          salePrice: (data.sale_price ?? '').toString(),
          stock: (data.stock_quantity ?? '').toString(),
        })
        setImageUrls(Array.isArray(data.images) ? data.images.map(i => i.image_url) : [])
      } catch (e) {
        setError(e?.message || 'Der skete en fejl')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProduct()
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Upload flere billeder (tilføjer til eksisterende)
  const handleImageChange = async (e) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    try {
      const uploaded = []
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`${API_BASE}/uploads/upload/`, { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Billedupload fejlede')
        const data = await res.json()
        uploaded.push(data.url)
      }
      // Tilføj til eksisterende
      setImageUrls(prev => [...prev, ...uploaded])
    } catch (err) {
      console.error(err)
      alert('Fejl under billedupload')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (url) => {
    setImageUrls(prev => prev.filter(u => u !== url))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)

      const payload = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        purchase_price: parseFloat(formData.purchasePrice),
        qty_per_koli: parseFloat(formData.qty_per_koli),
        sale_price: parseFloat(formData.salePrice),
        stock_quantity: parseInt(formData.stock),
        unit: "stk",
        images: imageUrls.map(url => ({ image_url: url })),
      }

      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT', // skift til PATCH hvis dit API bruger det
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        let msg = 'Opdatering fejlede'
        try {
          const err = await res.json()
          if (err?.detail) msg = err.detail
        } catch { }
        throw new Error(msg)
      }

      alert('✅ Produktet er opdateret')
      // Gå tilbage til produktet eller liste
      // router.push(`/product/${id}`)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Der opstod en fejl under opdatering.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Rediger produkt">
        <div className="p-10">Indlæser produkt…</div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Rediger produkt">
        <div className="p-10 text-red-500">Fejl: {error}</div>
      </Layout>
    )
  }

  return (
    <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Rediger produkt">
      <form className="tf-section-2 form-add-product" onSubmit={handleSubmit}>
        <div className="wg-box">
          {/* SKU */}
          <fieldset className="sku">
            <div className="body-title mb-10">SKU <span className="tf-color-1">*</span></div>
            <input
              className="mb-10"
              type="text"
              placeholder="Indtast produkt SKU"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
            />
          </fieldset>

          {/* Navn */}
          <fieldset className="name">
            <div className="body-title mb-10">Produktnavn <span className="tf-color-1">*</span></div>
            <input
              className="mb-10"
              type="text"
              placeholder="Indtast produktnavn"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </fieldset>

          {/* Priser */}
          <div className="gap2 cols">
            <fieldset className="purchase-price">
              <div className="body-title mb-10">Indkøbspris (DKK)</div>
              <input
                type="number" step="0.01"
                placeholder="F.eks. 50.00"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                required
              />
            </fieldset>
            <fieldset className="sale-price">
              <div className="body-title mb-10">Salgspris (DKK)</div>
              <input
                type="number" step="0.01"
                placeholder="F.eks. 99.00"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                required
              />
            </fieldset>
          </div>

          <div className="gap2 cols">
            <fieldset className="purchase-price">
              <div className="body-title mb-10">Stk's per koli</div>
              <input
                type="number" step="0.01"
                placeholder="F.eks. 50"
                name="qty_per_koli"
                value={formData.qty_per_koli}
                onChange={handleChange}
                required
              />
            </fieldset>


            {/* Lager */}
            <fieldset className="stock">
              <div className="body-title mb-10">Antal på lager</div>
              <input
                type="number"
                placeholder="F.eks. 100"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
              />
            </fieldset>
          </div>

          {/* Beskrivelse */}
          <fieldset className="description">
            <div className="body-title mb-10">Beskrivelse</div>
            <textarea
              className="mb-10"
              name="description"
              placeholder="Beskriv produktet..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </fieldset>
        </div>

        <div className="wg-box">
          <fieldset>
            <div className="body-title mb-10">Billeder</div>

            {/* Eksisterende + nye billeder */}
            <div className="upload-image mb-16">
              {imageUrls.map((url, idx) => (
                <div className="item relative" key={url + idx}>
                  <img src={url} alt={`Produkt billede ${idx + 1}`} />
                  <button
                    type="button"
                    className="tf-button style-1 absolute top-2 right-2"
                    onClick={() => removeImage(url)}
                    title="Fjern billede"
                  >
                    <i className="icon-trash-2" />
                  </button>
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
            <div className="body-text">Tilføj eller fjern billeder. Første billede bruges som hovedbillede.</div>
          </fieldset>

          <div className="cols gap10 mt-20">
            <button className="tf-button w-full" type="submit" disabled={saving}>
              {saving ? 'Gemmer…' : 'Gem ændringer'}
            </button>
            <Link className="tf-button style-1 w-full" href={`/product/${id}`}>
              Annullér
            </Link>
          </div>
        </div>
      </form>
    </Layout>
  )
}
