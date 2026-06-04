'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import CartQuantity from '@/components/elements/CartQuantity'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

const toNumber = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export default function ProductDetail1() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)

        // Ret stien hvis din backend bruger /products/products/{id}
        const res = await fetch(`${API_BASE}/products/${id}`)
        if (!res.ok) throw new Error('Kunne ikke hente produktet')

        const raw = await res.json()
        const data = Array.isArray(raw) ? raw[0] : raw  // 👈 håndter array/objekt

        const normalized = {
          id: data?.id,
          sku: data?.sku ?? '',
          name: data?.name ?? '',
          description: data?.description ?? '',
          sale_price: toNumber(data?.sale_price),
          purchase_price: toNumber(data?.purchase_price),
          stock_quantity: toNumber(data?.stock_quantity),
          qty_per_koli: toNumber(data?.qty_per_koli),
          unit: data?.unit ?? '',
          images: Array.isArray(data?.images) ? data.images : [],
        }

        setProduct(normalized)
        setActiveIdx(0)
      } catch (e) {
        setError(e?.message || 'Der skete en fejl')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProduct()
  }, [id])

  const imageUrls = useMemo(() => {
    if (product?.images?.length) return product.images.map(i => i.image_url)
    return ['/images/products/placeholder.png']
  }, [product?.images])

  const formatDKK = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 2 })
      : ''

  if (loading) {
    return (
      <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Product Detail">
        <div className="p-10">Indlæser produkt…</div>
      </Layout>
    )
  }

  if (error || !product) {
    return (
      <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Product Detail">
        <div className="p-10 text-red-500">Fejl: {error || 'Produktet blev ikke fundet'}</div>
      </Layout>
    )
  }

  return (
    <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Product Detail">
      <div className="tf-main-product section-image-zoom flex">
        {/* === Billed-galleri (simpelt & stabilt) === */}
        <div className="tf-product-media-wrap">
          <div className="image no-bg mb-4 flex justify-center items-center">
            <img
              src={imageUrls[activeIdx]}
              alt={product?.name || 'Produkt'}
              style={{ width: '50%', height: 'auto', objectFit: 'contain' }}
            />
          </div>

          {imageUrls.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-center items-center">
              {imageUrls.map((src, i) => (
                <button
                  type="button"
                  key={src + i}
                  onClick={() => setActiveIdx(i)}
                  className={`border rounded ${i === activeIdx ? 'border-black' : 'border-transparent'}`}
                  style={{ padding: 2 }}
                  title={`Billede ${i + 1}`}
                >
                  <img
                    src={src}
                    alt={`thumb-${i + 1}`}
                    style={{ width: 60, height: 60, objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === Produktinfo === */}
        <div className="tf-product-info-wrap relative flex-grow">
          <div className="tf-zoom-main" />
          <div className="tf-product-info-list other-image-zoom">
            <div className="tf-product-info-title">
              <h3 className="mb-2">{product.name || 'Uden navn'}</h3>
              <div className="text-sm opacity-70 mb-3">SKU: #{product.sku}</div>
              <div className="price body-title">{formatDKK(product.sale_price)}</div>
              <div className="mt-2 text-sm">
                Lagerstatus:{' '}
                {product.stock_quantity > 0 ? (
                  <span className="text-green-600">
                    På lager ({product.stock_quantity} stk{product.qty_per_koli ? ` · ${Math.floor(product.stock_quantity / product.qty_per_koli)} Koli à ${product.qty_per_koli}` : ''})
                  </span>
                ) : (
                  <span className="text-red-600">Udsolgt</span>
                )}
              </div>
            </div>

            <div className="tf-product-info-quantity">
              <div className="quantity-title body-text">Antal</div>
              <CartQuantity />
            </div>

            <div className="tf-product-info-buy-button">
              <form>
                <button
                  type="button"
                  className="tf-button flex-grow"
                  disabled={product.stock_quantity <= 0}
                  onClick={() => alert(`Tilføjet ${product.name || 'produkt'} til kurv`)}
                >
                  {product.stock_quantity > 0
                    ? `Læg i kurv – ${formatDKK(product.sale_price)}`
                    : 'Udsolgt'}
                </button>

                <div className="tf-product-btn-wishlist">
                  <i className="icon-heart" />
                </div>
              </form>
            </div>

            {product.description && (
              <div className="mt-6 body-text whitespace-pre-line">{product.description}</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
