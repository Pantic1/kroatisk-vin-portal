'use client'

import Link from "next/link"

const STATUS_STYLES = {
  pending:   { bg: "#FFF4E5", fg: "#A86600", label: "Afventer" },
  review:    { bg: "#E5F0FF", fg: "#0846A8", label: "Til gennemsyn" },
  confirmed: { bg: "#E5F5E8", fg: "#1A6B2E", label: "Godkendt" },
  shipped:   { bg: "#EFE5FF", fg: "#5B21B6", label: "Afsendt" },
  delivered: { bg: "#D1FADF", fg: "#054F31", label: "Leveret" },
  cancelled: { bg: "#FFE5E5", fg: "#A8001A", label: "Annulleret" },
}

const statusPillStyle = (s) => {
  const conf = STATUS_STYLES[(s || "").toLowerCase()] || { bg: "#EEE", fg: "#444" }
  return {
    background: conf.bg, color: conf.fg,
    padding: "4px 12px", borderRadius: 12,
    fontSize: 12, fontWeight: 600,
    textTransform: "capitalize", display: "inline-block", whiteSpace: "nowrap",
  }
}

const statusLabel = (s) => STATUS_STYLES[(s || "").toLowerCase()]?.label || s || "—"

const formatDKK = (n) =>
  Number.isFinite(+n)
    ? Number(n).toLocaleString("da-DK", { style: "currency", currency: "DKK" })
    : n ?? "—"

const colHead = { fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }

export default function OrderListClient({ orders }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px 100px 130px 90px',
        padding: '0 12px 8px', borderBottom: '2px solid #f0f0f0',
      }}>
        {['Kunde', 'Order ID', 'Total ex moms', 'Antal', 'Betalt', 'Status', 'Action'].map(h => (
          <span key={h} style={colHead}>{h}</span>
        ))}
      </div>

      {orders.length === 0 && (
        <div style={{ padding: '24px 12px', color: '#aaa', fontSize: 13 }}>Ingen ordrer fundet.</div>
      )}

      {orders.map((o, i) => {
        const customerName = o?.customer?.name || o?.company?.name || '—'
        const totalPrice = o?.subtotal_price
        const qty = Array.isArray(o?.items)
          ? o.items.reduce((n, it) => n + parseFloat(it.quantity || 0), 0)
          : 0
        const payment = o?.payment_status || '—'
        const status = o?.status
        const bg = i % 2 === 0 ? '#fafafa' : '#fff'

        return (
          <Link key={o.id} href={`/order-detail/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px 100px 130px 90px',
                alignItems: 'center', padding: '10px 12px',
                borderRadius: 10, background: bg, transition: 'background .15s', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
              onMouseLeave={e => e.currentTarget.style.background = bg}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {customerName}
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>#{o?.order_id}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A6B2E' }}>{formatDKK(totalPrice)}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{qty}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{payment}</div>
              <div><span style={statusPillStyle(status)}>{statusLabel(status)}</span></div>
              <div style={{ display: 'flex', gap: 8 }} onClick={e => e.preventDefault()}>
                <Link href={`/order-detail/${o.id}`} className="item edit" title="Se ordre">
                  <i className="icon-eye" style={{ fontSize: 18, color: '#0846A8' }} />
                </Link>
                <Link href={`/create-order/${o.id}`} className="item edit" title="Rediger">
                  <i className="icon-edit-3" style={{ fontSize: 18, color: '#1A6B2E' }} />
                </Link>
                <button className="item trash" title="Slet" disabled style={{ background: 'none', border: 'none', cursor: 'not-allowed', opacity: 0.3 }}>
                  <i className="icon-trash-2" style={{ fontSize: 18, color: '#c0392b' }} />
                </button>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
