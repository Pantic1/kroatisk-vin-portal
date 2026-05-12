'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Layout from '@/components/layout/Layout'

// Apex er allerede i package.json - loaded dynamisk pga. SSR
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// ---------------- helpers ----------------
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v)) || 0
const formatDKK = (n) =>
  Number.isFinite(+n)
    ? Number(n).toLocaleString('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 })
    : '—'
const formatNumber = (n) =>
  Number.isFinite(+n) ? Number(n).toLocaleString('da-DK') : '—'
const formatDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('da-DK', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return d }
}

// ---------------- status pill ----------------
const STATUS_PILL = {
  pending:   { bg: '#FFF4E5', fg: '#A86600', label: 'Afventer' },
  review:    { bg: '#E5F0FF', fg: '#0846A8', label: 'Til gennemsyn' },
  confirmed: { bg: '#E5F5E8', fg: '#1A6B2E', label: 'Godkendt' },
  shipped:   { bg: '#EFE5FF', fg: '#5B21B6', label: 'Afsendt' },
  delivered: { bg: '#D1FADF', fg: '#054F31', label: 'Leveret' },
  cancelled: { bg: '#FFE5E5', fg: '#A8001A', label: 'Annulleret' },
}
const StatusPill = ({ status }) => {
  const c = STATUS_PILL[(status || '').toLowerCase()] || { bg: '#EEE', fg: '#444' }
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '3px 10px', borderRadius: 12,
      fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize', display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {c.label || status}
    </span>
  )
}

// =================================================================
// HOVED-SIDE
// =================================================================
export default function Home() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [periodDays]          = useState(30)

  // Fallback: hvis /dashboard/stats ikke findes endnu, aggregér client-side
  // ud fra /orders/ som vi ved virker
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const res = await fetch(`${API_BASE}dashboard/stats?period_days=${periodDays}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setStats(data)
        } else {
          // Fallback: hent /orders/ og aggregér
          const fb = await fetchFallbackStats(periodDays)
          if (!cancelled) setStats(fb)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Der skete en fejl')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [periodDays])

  if (loading) return <Layout><div className="wg-box">Henter dashboard…</div></Layout>
  if (error)   return <Layout><div className="wg-box" style={{ color: 'red' }}>{error}</div></Layout>
  if (!stats)  return <Layout><div className="wg-box">Ingen data</div></Layout>

  return (
    <Layout breadcrumbTitleParent="Dashboard" breadcrumbTitle="Overblik">
      {/* KPI cards */}
      <KpiCards stats={stats} />

      {/* Chart + status */}
      <div className="mb-30" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <RevenueChart data={stats.revenue_by_day || []} />
        <StatusBreakdown counts={stats.status_counts || {}} />
      </div>

      {/* Top produkter + top kunder */}
      <div className="mb-30" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <TopProducts products={stats.top_products || []} />
        <TopCustomers customers={stats.top_customers || []} />
      </div>

      {/* Seneste ordrer + lavt lager */}
      <div className="mb-30" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <RecentOrdersWidget orders={stats.recent_orders || []} />
        <LowStock products={stats.low_stock || []} />
      </div>
    </Layout>
  )
}

// =================================================================
// FALLBACK: aggregér fra /orders/ hvis /dashboard/stats ikke virker
// =================================================================
async function fetchFallbackStats(periodDays) {
  const [oRes, pRes] = await Promise.all([
    fetch(`${API_BASE}/orders`),
    fetch(`${API_BASE}/products/`),
  ])
  const orders   = oRes.ok ? await oRes.json() : []
  const products = pRes.ok ? await pRes.json() : []
  const list = Array.isArray(orders?.items) ? orders.items : (Array.isArray(orders) ? orders : [])

  const active = list.filter(o => (o.status || '').toLowerCase() !== 'cancelled')
  const total_revenue = active.reduce((s, o) => s + toNumber(o.subtotal_price), 0)
  const customers = new Set(active.map(o => o.customer_id)).size
  const avg = active.length ? total_revenue / active.length : 0

  const status_counts = {}
  list.forEach(o => {
    const s = (o.status || 'unknown').toLowerCase()
    status_counts[s] = (status_counts[s] || 0) + 1
  })

  // Revenue pr. dag
  const since = new Date(); since.setDate(since.getDate() - periodDays)
  const byDay = new Map()
  active.forEach(o => {
    const d = new Date(o.order_date)
    if (d < since) return
    const key = d.toISOString().slice(0, 10)
    const cur = byDay.get(key) || { revenue: 0, orders: 0 }
    cur.revenue += toNumber(o.subtotal_price)
    cur.orders  += 1
    byDay.set(key, cur)
  })
  const revenue_by_day = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }))

  // Top kunder
  const customerMap = new Map()
  active.forEach(o => {
    const cid = o.customer_id
    const cur = customerMap.get(cid) || {
      company_id: cid,
      name:       o.company?.name || cid,
      cvr:        o.company?.cvr  || '',
      orders_count: 0, total_spent: 0,
    }
    cur.orders_count += 1
    cur.total_spent  += toNumber(o.subtotal_price)
    customerMap.set(cid, cur)
  })
  const top_customers = Array.from(customerMap.values())
    .sort((a, b) => b.total_spent - a.total_spent).slice(0, 5)

  // Lavt lager
  const low_stock = (Array.isArray(products) ? products : [])
    .filter(p => toNumber(p.stock_quantity) <= 20)
    .sort((a, b) => toNumber(a.stock_quantity) - toNumber(b.stock_quantity))
    .slice(0, 8)
    .map(p => ({
      product_id: p.id, sku: p.sku, name: p.name,
      stock_quantity: p.stock_quantity, qty_per_koli: p.qty_per_koli,
    }))

  // Seneste ordrer
  const recent_orders = [...list]
    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
    .slice(0, 8)
    .map(o => ({
      id: o.id, order_id: o.order_id, order_date: o.order_date,
      status: o.status, subtotal_price: o.subtotal_price,
      company_name: o.company?.name, company_id: o.customer_id,
    }))

  return {
    period_days: periodDays,
    totals: {
      total_revenue, orders_count: active.length,
      customers_count: customers, avg_order_value: avg,
    },
    period_totals: {
      total_revenue: revenue_by_day.reduce((s, x) => s + x.revenue, 0),
      orders_count:  revenue_by_day.reduce((s, x) => s + x.orders, 0),
    },
    status_counts,
    revenue_by_day,
    top_products: [],   // kræver order_items - skipped i fallback
    top_customers,
    recent_orders,
    low_stock,
  }
}

// =================================================================
// KPI CARDS
// =================================================================
function KpiCards({ stats }) {
  const cards = [
    { label: 'Total omsætning',  value: formatDKK(stats.totals?.total_revenue),    icon: '💰', tint: '#E5F5E8' },
    { label: 'Antal ordrer',      value: formatNumber(stats.totals?.orders_count),  icon: '📦', tint: '#E5F0FF' },
    { label: 'Aktive kunder',     value: formatNumber(stats.totals?.customers_count), icon: '👥', tint: '#FFF4E5' },
    { label: 'Snit ordreværdi',   value: formatDKK(stats.totals?.avg_order_value),  icon: '📊', tint: '#EFE5FF' },
  ]
  return (
    <div
      className="mb-30"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
    >
      {cards.map((c, i) => (
        <div key={i} className="wg-box" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: c.tint,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>{c.icon}</div>
          <div>
            <div className="body-text" style={{ fontSize: 12, color: '#777' }}>{c.label}</div>
            <h4 style={{ marginBottom: 0 }}>{c.value}</h4>
          </div>
        </div>
      ))}
    </div>
  )
}

// =================================================================
// REVENUE CHART
// =================================================================
function RevenueChart({ data }) {
  const options = useMemo(() => ({
    chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] },
    },
    colors: ['#1A6B2E'],
    xaxis: {
      type: 'datetime',
      categories: data.map(d => d.day),
      labels: { format: 'dd MMM' },
    },
    yaxis: {
      labels: { formatter: (v) => formatDKK(v) },
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
      y: { formatter: (v) => formatDKK(v) },
    },
    grid: { borderColor: '#eee', strokeDashArray: 4 },
  }), [data])

  const series = useMemo(() => ([
    { name: 'Omsætning', data: data.map(d => Math.round(d.revenue)) },
  ]), [data])

  return (
    <div className="wg-box">
      <div className="flex items-center justify-between mb-3">
        <h5 style={{ marginBottom: 0 }}>Omsætning seneste 30 dage</h5>
      </div>
      {data.length === 0 ? (
        <div className="body-text" style={{ padding: '40px 0', textAlign: 'center' }}>
          Ingen omsætning at vise endnu.
        </div>
      ) : (
        <ApexChart options={options} series={series} type="area" height={280} />
      )}
    </div>
  )
}

// =================================================================
// STATUS BREAKDOWN
// =================================================================
function StatusBreakdown({ counts }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const rows = Object.entries(counts).sort(([, a], [, b]) => b - a)

  return (
    <div className="wg-box">
      <h5 className="mb-3">Ordrestatus</h5>
      {total === 0 ? (
        <div className="body-text">Ingen ordrer endnu.</div>
      ) : (
        <ul className="flex flex-column gap10">
          {rows.map(([status, count]) => {
            const pct = total ? (count / total) * 100 : 0
            const c = STATUS_PILL[status] || { bg: '#EEE', fg: '#444' }
            return (
              <li key={status}>
                <div className="flex items-center justify-between mb-1">
                  <StatusPill status={status} />
                  <span className="body-title-2">{count}</span>
                </div>
                <div style={{ background: '#f3f3f3', height: 6, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c.fg, transition: 'width .3s' }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// =================================================================
// TOP PRODUCTS
// =================================================================
function TopProducts({ products }) {
  return (
    <div className="wg-box">
      <h5 className="mb-3">Top 5 mest solgte produkter</h5>
      {products.length === 0 ? (
        <div className="body-text">Ingen salg endnu.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <th style={th('left')}>Produkt</th>
              <th style={th('right')}>Antal</th>
              <th style={th('right')}>Omsætning</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.product_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td('left')}>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 11, color: '#888' }}>SKU: {p.sku}</div>
                </td>
                <td style={td('right')}>{formatNumber(toNumber(p.total_quantity))}</td>
                <td style={td('right')}>{formatDKK(p.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// =================================================================
// TOP CUSTOMERS
// =================================================================
function TopCustomers({ customers }) {
  return (
    <div className="wg-box">
      <h5 className="mb-3">Top 5 kunder</h5>
      {customers.length === 0 ? (
        <div className="body-text">Ingen kunder endnu.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <th style={th('left')}>Kunde</th>
              <th style={th('right')}>Ordrer</th>
              <th style={th('right')}>Omsætning</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.company_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td('left')}>
                  <Link href={`/company-details/${c.company_id}`} style={{ color: '#222', textDecoration: 'none' }}>
                    <strong>{c.name}</strong>
                  </Link>
                  {c.cvr && <div style={{ fontSize: 11, color: '#888' }}>CVR: {c.cvr}</div>}
                </td>
                <td style={td('right')}>{formatNumber(c.orders_count)}</td>
                <td style={td('right')}>{formatDKK(c.total_spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// =================================================================
// RECENT ORDERS WIDGET
// =================================================================
function RecentOrdersWidget({ orders }) {
  return (
    <div className="wg-box">
      <div className="flex items-center justify-between mb-3">
        <h5 style={{ marginBottom: 0 }}>Seneste ordrer</h5>
        <Link href="/order-list" className="body-text">Se alle →</Link>
      </div>
      {orders.length === 0 ? (
        <div className="body-text">Ingen ordrer endnu.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <th style={th('left')}>Ordre</th>
              <th style={th('left')}>Kunde</th>
              <th style={th('left')}>Dato</th>
              <th style={th('right')}>Total</th>
              <th style={th('left')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td('left')}><strong>#{o.order_id}</strong></td>
                <td style={td('left')}>
                  <Link href={`/company-details/${o.company_id}`} style={{ color: '#222', textDecoration: 'none' }}>
                    {o.company_name || '—'}
                  </Link>
                </td>
                <td style={td('left')}>{formatDate(o.order_date)}</td>
                <td style={td('right')}>{formatDKK(o.subtotal_price)}</td>
                <td style={td('left')}><StatusPill status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// =================================================================
// LOW STOCK
// =================================================================
function LowStock({ products }) {
  return (
    <div className="wg-box">
      <h5 className="mb-3">⚠️ Lavt lager</h5>
      {products.length === 0 ? (
        <div className="body-text">Alle produkter har god lagerbeholdning.</div>
      ) : (
        <ul className="flex flex-column gap10">
          {products.map(p => {
            const stock = toNumber(p.stock_quantity)
            const isCritical = stock <= 5
            return (
              <li
                key={p.product_id}
                style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="body-title-2">{p.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>SKU: {p.sku}</div>
                  </div>
                  <span style={{
                    background: isCritical ? '#FFE5E5' : '#FFF4E5',
                    color:      isCritical ? '#A8001A' : '#A86600',
                    padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  }}>
                    {stock} stk
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------- shared table styles ----------------
const th = (align) => ({
  textAlign: align, padding: '8px 10px', fontSize: 11, fontWeight: 600,
  color: '#666', textTransform: 'uppercase', letterSpacing: 0.4,
})
const td = (align) => ({
  textAlign: align, padding: '12px 10px', fontSize: 13, color: '#222', verticalAlign: 'top',
})
