'use client'

import Layout from "@/components/layout/Layout"
import CartDrawerMount from "@/components/cart/CartDrawerMount"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import './style.css'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v)) || 0

const formatDKK = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })
    : ''

function readCart() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem('cart') || '[]')
  } catch {
    return []
  }
}

function writeCart(items) {
  localStorage.setItem('cart', JSON.stringify(items))
  window.dispatchEvent(new Event('cartUpdated'))
}

function calcCartTotals(items) {
  const subtotal = items.reduce(
    (sum, i) => sum + toNumber(i.price) * toNumber(i.quantity),
    0
  )

  const totalQty = items.reduce(
    (sum, i) => sum + toNumber(i.quantity),
    0
  )

  return {
    subtotal,
    totalQty,
  }
}

function buildOrderPayload(items) {
  const { subtotal } = calcCartTotals(items)

  return {
    currency: 'DKK',
    total_price: Number(subtotal.toFixed(2)),
    items: items.map((i) => ({
      product_id: i.id,
      sku: i.sku,
      name: i.name,
      quantity: toNumber(i.quantity),
      unit_price: toNumber(i.price),
      line_total: Number(
        (toNumber(i.price) * toNumber(i.quantity)).toFixed(2)
      ),
    })),
  }
}

async function checkout() {
  const cart = readCart()

  if (!cart.length) {
    alert('Kurven er tom.')
    return
  }

  const payload = buildOrderPayload(cart)

  try {
    const res = await fetch(`${API_BASE}/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'Fejl ved oprettelse af ordre')
    }

    const data = await res.json()
    alert('Ordre oprettet!')
    return data
  } catch (e) {
    console.error(e)
    alert('Kunne ikke sende ordre til API.')
  }
}

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const params = useParams()

  const companyId = params?.companyID || params?.companyId || params?.id
  useEffect(() => {

    if (!companyId) return

    const fetchProducts = async () => {

      try {

        const res = await fetch(`${API_BASE}/company/${companyId}/prices`)

        if (!res.ok) {

          throw new Error("Kunne ikke hente kundens priser")

        }

        const data = await res.json()

        const normalized = Array.isArray(data)

          ? data.map((p) => ({

            ...p,

            id: p.id || p.product_id,

            sale_price: p.effective_price ?? p.special_price ?? p.sale_price,

          }))

          : []

        setProducts(normalized)

      } catch (err) {

        console.error("Fejl ved hentning af produkter:", err)

      }

    }

    fetchProducts()

  }, [companyId])


  const addToCart = (product) => {
    try {
      const stockPcs = toNumber(product.stock_quantity)
      const cart = readCart()
      const idx = cart.findIndex((i) => i.id === product.id)

      const existingQty = idx >= 0 ? toNumber(cart[idx].quantity) : 0
      const remainingPcs = Math.max(0, stockPcs - existingQty)

      if (remainingPcs < 1) {
        alert("Ikke nok på lager.")
        return
      }

      const image =
        product.images?.[0]?.image_url || "/images/products/placeholder.png"

      const pricePerPiece = toNumber(product.sale_price)
      const addQty = 1

      if (idx >= 0) {
        cart[idx].quantity = toNumber(cart[idx].quantity) + addQty
      } else {
        cart.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: pricePerPiece,
          purchase_price: product.purchase_price,
          image,
          quantity: addQty,

        })
      }

      writeCart(cart)

      const { subtotal } = calcCartTotals(cart)
      localStorage.setItem(
        'cart_total_price_dkk',
        String(Number(subtotal.toFixed(2)))
      )
    } catch (e) {
      console.error(e)
      alert("Kunne ikke lægge i kurven.")
    }
  }

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()

    return products.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
  }, [products, searchTerm])

  return (
    <Layout breadcrumbTitleParent="Ecommerce" breadcrumbTitle="Produkter">
      <div className="products-page">
        <div className="products-toolbar">
          <form
            className="product-search"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="text"
              placeholder="Søg her..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button type="submit">
              <i className="icon-search" />
            </button>
          </form>
        </div>

        <div className="products-grid">
          {filtered.map((p) => {
            const pricePerPiece = toNumber(p.sale_price)
            const stockPcs = toNumber(p.stock_quantity)
            const inStock = stockPcs > 0
            const image =
              p.images?.[0]?.image_url || "/images/products/placeholder.png"

            return (
              <div key={p.id} className="product-card">
                <Link
                  href={`/product-detail/${p.id}`}
                  className="product-image-wrap"
                >
                  <img
                    src={image}
                    alt={p.name}
                    className="product-image"
                  />
                </Link>

                <div className="product-content">
                  <div className="product-name">{p.name}</div>

                  <div className="product-sku">
                    SKU: #{p.sku}
                  </div>

                  <div className="product-price">
                    {formatDKK(pricePerPiece)}
                  </div>

                  <div className="product-stock">
                    Lager: {stockPcs} stk
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className="product-add-btn"
                    disabled={!inStock}
                  >
                    Tilføj 1 flaske
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-6 body-text">
            Ingen produkter fundet.
          </div>
        )}

        <CartDrawerMount />
      </div>
    </Layout>
  )
}