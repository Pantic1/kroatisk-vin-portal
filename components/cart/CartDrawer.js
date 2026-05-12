'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import './style.css'

const toNumber = (v) =>
  (typeof v === 'number' ? v : parseFloat(v)) || 0

const formatDKK = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })
    : ''

const round2 = (n) =>
  Math.round((toNumber(n) + Number.EPSILON) * 100) / 100

const MOMS_RATE = 0.25

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

export default function CartDrawer({ open, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL
  const { id } = useParams()

  useEffect(() => {
    setItems(readCart())
  }, [])

  useEffect(() => {
    const sync = () => setItems(readCart())
    const esc = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('cartUpdated', sync)
    window.addEventListener('storage', sync)
    window.addEventListener('keydown', esc)

    return () => {
      window.removeEventListener('cartUpdated', sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, i) => acc + toNumber(i.price) * toNumber(i.quantity),
        0
      ),
    [items]
  )

  const moms = useMemo(() => subtotal * MOMS_RATE, [subtotal])
  const total = useMemo(() => subtotal + moms, [subtotal, moms])

  const inc = (itemId) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity: toNumber(i.quantity) + 1 }
          : i
      )

      writeCart(next)
      return next
    })
  }

  const dec = (itemId) => {
    setItems((prev) => {
      const next = prev
        .map((i) =>
          i.id === itemId
            ? {
              ...i,
              quantity: Math.max(0, toNumber(i.quantity) - 1),
            }
            : i
        )
        .filter((i) => toNumber(i.quantity) > 0)

      writeCart(next)
      return next
    })
  }

  const removeItem = (itemId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId)
      writeCart(next)
      return next
    })
  }

  const clear = () => {
    writeCart([])
    setItems([])
  }

  async function SendToRewiew() {
    setMsg(null)

    const customer_id = id

    if (!customer_id) {
      setMsg('Du skal være logget ind for at sende til godkendelse.')
      return
    }

    if (!items.length) {
      setMsg('Kurven er tom.')
      return
    }

    const lines = items.map((i) => ({
      product_id: i.product_id || i.id,
      quantity: toNumber(i.quantity),
      unit_price: toNumber(i.price),
      line_total: round2(toNumber(i.price) * toNumber(i.quantity)),
      sku: i.sku || undefined,
      name: i.name || undefined,
    }))

    const subtotal_price = round2(
      lines.reduce((s, l) => s + toNumber(l.line_total), 0)
    )

    const payload = {
      customer_id,
      status: 'review',
      notes: null,
      currency: 'DKK',
      subtotal_price,
      items: lines,
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_BASE}/orders/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Kunne ikke oprette ordre.')
      }

      const data = await res.json()

      clear()
      setMsg(`Ordre #${data.id} blev sendt til godkendelse.`)
    } catch (e) {
      setMsg(e?.message || 'Noget gik galt.')
    } finally {
      setLoading(false)
    }
  }

  const totalProfit = useMemo(() => {

    return items.reduce((sum, item) => {

      const salePrice = toNumber(item.price || item.sale_price)

      const purchasePrice = toNumber(item.purchase_price)

      const profitPerItem = salePrice - purchasePrice

      return sum + (profitPerItem * toNumber(item.quantity))

    }, 0)

  }, [items])

  return (
    <>
      <div
        className={`cart-overlay ${open ? 'is-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`cart-drawer ${open ? 'is-open' : ''}`}>
        <div className="cart-header">
          <div>
            <h3>Kurv</h3>
            <p>{items.length} produkter</p>
          </div>

          <div className="cart-header-actions">
            {items.length > 0 && (
              <button type="button" className="cart-clear-btn" onClick={clear}>
                Tøm
              </button>
            )}

            <button type="button" className="cart-close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="cart-content">
          {items.length === 0 ? (
            <div className="cart-empty">Din kurv er tom.</div>
          ) : (
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <img
                    src={item.image || '/images/products/placeholder.png'}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>

                    {item.sku && (
                      <div className="cart-item-sku">SKU: {item.sku}</div>
                    )}

                    <div className="cart-item-price">
                      {formatDKK(toNumber(item.price))}
                    </div>

                    <div className="cart-mobile-total">
                      {formatDKK(toNumber(item.price) * toNumber(item.quantity))}
                    </div>
                  </div>

                  <div className="cart-item-actions">
                    <div className="cart-qty">
                      <button type="button" onClick={() => dec(item.id)}>
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button type="button" onClick={() => inc(item.id)}>
                        +
                      </button>
                    </div>

                    <div className="cart-line-total">
                      {formatDKK(toNumber(item.price) * toNumber(item.quantity))}
                    </div>

                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => removeItem(item.id)}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total-row">
            <span>Subtotal</span>
            <strong>{formatDKK(subtotal)}</strong>
          </div>

          <div className="cart-total-row">
            <span>Moms (25%)</span>
            <strong>{formatDKK(moms)}</strong>
          </div>

          <div className="cart-total-row is-total">
            <span>Total</span>
            <strong>{formatDKK(total)}</strong>
          </div>

          <div className="cart-profit-row">
            <span>Du har tjent</span>
            <strong>{formatDKK(subtotal * 0.10)}</strong>
          </div>
          
          <div className="cart-profit-row">

            <span>Total fortjeneste</span>

            <strong>{formatDKK(totalProfit)}</strong>

          </div>

          <button
            className="cart-submit-btn"
            disabled={items.length === 0 || loading}
            onClick={SendToRewiew}
          >
            {loading ? 'Sender…' : 'Send til godkendelse'}
          </button>

          {msg && <p className="cart-message">{msg}</p>}
        </div>
      </aside>
    </>
  )
}