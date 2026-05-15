'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import './style.css'

import Layout from '@/components/layout/Layout'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// ---------------- helpers ----------------
const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v)) || 0
const formatDKK = (n) =>
  Number.isFinite(+n)
    ? Number(n).toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })
    : '—'
const formatDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('da-DK', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return d }
}
const statusClass = (s) => {
  const v = (s || '').toLowerCase()
  if (['delivered', 'shipped', 'confirmed'].includes(v)) return 'block-available'
  if (['pending', 'review'].includes(v)) return 'block-pending'
  if (['cancelled'].includes(v)) return 'block-not-available'
  return 'block-pending'
}

// =================================================================
// SIDE
// =================================================================
export default function CompanyDetailsPage() {
  const { id } = useParams() || {}

  const [company, setCompany] = useState(null)
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [prices, setPrices] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Hent alt parallelt
  useEffect(() => {
    if (!id) return
    let cancelled = false
      ; (async () => {
        try {
          setLoading(true); setError(null)
          const [cRes, oRes, sRes, pRes, allProdRes] = await Promise.all([
            fetch(`${API_BASE}/company/${id}`),
            fetch(`${API_BASE}/company/${id}/orders`),
            fetch(`${API_BASE}/company/${id}/stats`),
            fetch(`${API_BASE}/company/${id}/prices`),
            fetch(`${API_BASE}/products/`),           // fallback - vi ved den virker
          ])
          if (!cRes.ok) throw new Error('Kunne ikke hente virksomheden')
          const [c, o, s, p, allProds] = await Promise.all([
            cRes.json(),
            oRes.ok ? oRes.json() : [],
            sRes.ok ? sRes.json() : null,
            pRes.ok ? pRes.json() : [],
            allProdRes.ok ? allProdRes.json() : [],
          ])
          if (cancelled) return

          // Byg en samlet liste: ALLE produkter + flag for om kunden har en særpris
          const priceArr = Array.isArray(p) ? p : []
          const prodArr = Array.isArray(allProds) ? allProds : []
          const priceById = new Map(priceArr.map(x => [x.product_id, x]))

          // Hvis /prices endpoint VIRKER, brug det som sandhed.
          // Ellers fald tilbage til alle produkter (med has_special=false)
          const merged = prodArr.length > 0
            ? prodArr.map(prod => {
              const sp = priceById.get(prod.id)
              return {
                product_id: prod.id,
                sku: prod.sku,
                name: prod.name,
                sale_price: prod.sale_price,
                purchase_price: prod.purchase_price,
                stock_quantity: prod.stock_quantity,
                image_url: prod.images?.[0]?.image_url || null,
                special_price: sp?.special_price ?? null,
                has_special: sp?.special_price != null,
                effective_price: sp?.special_price ?? prod.sale_price,
                last_purchase_price: sp?.last_purchase_price ?? null,
              }
            })
            : priceArr   // ingen produkter? brug det /prices returnerede

          setCompany(c)
          setOrders(Array.isArray(o) ? o : [])
          setStats(s)
          setPrices(merged)
        } catch (err) {
          if (!cancelled) setError(err?.message || 'Der skete en fejl')
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <Layout><div className="wg-box">Henter…</div></Layout>
  if (error) return <Layout><div className="wg-box" style={{ color: 'red' }}>{error}</div></Layout>
  if (!company) return <Layout><div className="wg-box">Virksomhed ikke fundet</div></Layout>

  return (
    <Layout breadcrumbTitleParent="Virksomheder" breadcrumbTitle={company.name}>
      {/* INFO / KONTAKTER / NOTER TABS - øverst over firmanavn */}
      <CompanyInfoTabs
        company={company}
        onUpdated={(updated) => setCompany(updated)}
      />

      {/* HEADER */}
      <CompanyHeader company={company} stats={stats} />

      {/* STATS CARDS */}
      <StatsCards stats={stats} />

      {/* TOP PRODUKTER + ORDRE LISTE side om side */}
      <div
        className="mb-30"
        style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}
      >
        <TopProducts products={stats?.top_products || []} />
        <RecentOrders orders={orders} />
      </div>

      {/* ALLE PRODUKTER MED PRISER (inline rediger) */}
      <PriceTable
        companyId={id}
        prices={prices}
        onUpdated={(updated) => setPrices(updated)}
      />
    </Layout>
  )
}

// =================================================================
// HEADER
// =================================================================
function CompanyHeader({ company, stats }) {
  return (
    <div className="wg-box mb-30">
      <div className="flex items-center justify-between gap20 flex-wrap">
        <div>
          <h4 className="mb-2">{company.name}</h4>
          <div className="body-text">
            CVR: <strong>{company.cvr || '—'}</strong>
            {company.city && <> · {company.city}</>}
            {company.country && <> · {company.country}</>}
          </div>
          {company.email && <div className="body-text">{company.email}</div>}
        </div>

        <div className="flex gap10">
          <Link href={`/create-order/${company.id}`} className="tf-button style-1">
            <i className="icon-plus" /> Opret ordre
          </Link>
        </div>
      </div>
    </div>
  )
}

// =================================================================
// STATS CARDS
// =================================================================
function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Total købt hos os',
      value: formatDKK(stats?.total_spent),
      icon: 'icon-dollar-sign',
    },
    {
      label: 'Antal ordrer',
      value: stats?.orders_count ?? 0,
      icon: 'icon-shopping-bag',
    },
    {
      label: 'Sidste ordre',
      value: formatDate(stats?.last_order_date),
      icon: 'icon-calendar',
    },
  ]
  return (
    <div
      className="mb-30"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
    >
      {cards.map((c, i) => (
        <div key={i} className="wg-box">
          <div className="body-text mb-2">{c.label}</div>
          <h4 style={{ marginBottom: 0 }}>{c.value}</h4>
        </div>
      ))}
    </div>
  )
}

// =================================================================
// INFO TABS - Stamdata / Kontakter / Noter
// =================================================================
// Bruger PRÆCIS samme markup som create-company:
//   <div className="widget-tabs">
//     <ul className="widget-menu-tab"> ... </ul>
//     <div className="widget-content-tab">
//       <div className="widget-content-inner active" style={{ display: ... }}>
//         <fieldset className="mb-24">
//           <div className="body-title mb-10">Label</div>
//           <input ... />
//         </fieldset>
//       </div>
//     </div>
//   </div>
function CompanyInfoTabs({ company, onUpdated }) {
  const [tab, setTab] = useState(null)   // null = ingen tab aktiv (alt skjult)
  const [form, setForm] = useState(() => fromCompany(company))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Klik på en tab: åbn hvis lukket, eller luk hvis allerede åben (toggle)
  const toggleTab = (n) => setTab(prev => prev === n ? null : n)

  useEffect(() => { setForm(fromCompany(company)) }, [company])

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const addContact = () => setForm(prev => ({
    ...prev,
    contacts: [...prev.contacts, {
      id: crypto.randomUUID(), _new: true,
      name: '', email: '', role: '', ownershipPct: undefined,
    }],
  }))
  const removeContact = (id) => setForm(prev => ({
    ...prev,
    contacts: prev.contacts.filter(c => c.id !== id),
  }))
  const updateContact = (id, patch) => setForm(prev => ({
    ...prev,
    contacts: prev.contacts.map(c => c.id === id ? { ...c, ...patch } : c),
  }))

  const totalOwnership = form.contacts.reduce(
    (s, c) => s + (Number(c.ownershipPct) || 0), 0,
  )

  const handleSave = async () => {
    setMessage('')
    if (totalOwnership > 100 + 1e-6) {
      setMessage('Samlet ejerskab må ikke overstige 100%')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name, cvr: form.cvr,
        companyType: form.companyType, industry: form.industry,
        vatRegistered: form.vatRegistered, ean: form.ean,
        phone: form.phone, email: form.email, website: form.website,
        address: form.address, zip: form.zip, city: form.city,
        country: form.country, iban: form.iban, swift: form.swift,
        notes: form.notes, status: form.status,
        kontakter: form.contacts.map(c => ({
          name: c.name, email: c.email, role: c.role,
          ownershipPct: typeof c.ownershipPct === 'number' ? c.ownershipPct : undefined,
        })),
      }
      const res = await fetch(`${API_BASE}/company/${company.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text() || 'Kunne ikke gemme')
      const updated = await res.json()
      onUpdated?.(updated)
      setMessage('Ændringer gemt')
      setTimeout(() => setMessage(''), 2500)
    } catch (e) {
      setMessage(e?.message || 'Der skete en fejl')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-new-page mb-30" onSubmit={(e) => e.preventDefault()}>
     <div className="wg-box">
      <div className="widget-tabs">
        <ul className="widget-menu-tab">
          <li className={tab === 1 ? 'item-title active' : 'item-title'} onClick={() => toggleTab(1)}>
            <span className="inner"><span className="h6">Stamdata</span></span>
          </li>
          <li className={tab === 2 ? 'item-title active' : 'item-title'} onClick={() => toggleTab(2)}>
            <span className="inner"><span className="h6">Kontakter</span></span>
          </li>
          <li className={tab === 3 ? 'item-title active' : 'item-title'} onClick={() => toggleTab(3)}>
            <span className="inner"><span className="h6">Noter</span></span>
          </li>
        </ul>

        <div className="widget-content-tab" style={{ display: tab === null ? 'none' : 'block' }}>
          {/* --- Tab 1: Stamdata --- */}
          <div className="widget-content-inner" style={{ display: tab === 1 ? 'block' : 'none' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset className="mb-24">
                <div className="body-title mb-10">CVR</div>
                <input type="text" placeholder="Fx 12345678" value={form.cvr}
                       onChange={e => setField('cvr', e.target.value.replace(/\D/g, ''))} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Firmanavn</div>
                <input type="text" placeholder="Navn" value={form.name}
                       onChange={e => setField('name', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Selskabsform</div>
                <div className="select">
                  <select value={form.companyType || ''} onChange={e => setField('companyType', e.target.value)}>
                    <option value="">—</option>
                    <option>Enkeltmandsvirksomhed</option>
                    <option>ApS</option>
                    <option>Anpartsselskab</option>
                    <option>A/S</option>
                    <option>I/S</option>
                    <option>K/S</option>
                    <option>IVS</option>
                    <option>Forening</option>
                    <option>Andet</option>
                  </select>
                </div>
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Branche (NACE)</div>
                <input type="text" placeholder="Fx 561010 - Restauranter"
                       value={form.industry || ''} onChange={e => setField('industry', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Telefon</div>
                <input type="tel" placeholder="+45 …" value={form.phone || ''}
                       onChange={e => setField('phone', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Email</div>
                <input type="email" placeholder="kontakt@firma.dk" value={form.email || ''}
                       onChange={e => setField('email', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Website</div>
                <input type="url" placeholder="https://firma.dk" value={form.website || ''}
                       onChange={e => setField('website', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24 md:col-span-2">
                <div className="body-title mb-10">Adresse</div>
                <input type="text" placeholder="Adresse" value={form.address || ''}
                       onChange={e => setField('address', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Postnr.</div>
                <input type="text" placeholder="0000" value={form.zip || ''}
                       onChange={e => setField('zip', e.target.value.replace(/\D/g, ''))} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">By</div>
                <input type="text" placeholder="By" value={form.city || ''}
                       onChange={e => setField('city', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Land</div>
                <input type="text" placeholder="Land" value={form.country || ''}
                       onChange={e => setField('country', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">EAN-nummer</div>
                <input type="text" placeholder="(valgfri)" value={form.ean || ''}
                       onChange={e => setField('ean', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.vatRegistered}
                         onChange={e => setField('vatRegistered', e.target.checked)} />
                  <span className="body-title">Momsregistreret</span>
                </label>
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">IBAN</div>
                <input type="text" placeholder="DK.." value={form.iban || ''}
                       onChange={e => setField('iban', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">SWIFT/BIC</div>
                <input type="text" placeholder="NDEADKKK" value={form.swift || ''}
                       onChange={e => setField('swift', e.target.value)} />
              </fieldset>

              <fieldset className="mb-24">
                <div className="body-title mb-10">Status</div>
                <div className="select">
                  <select value={form.status || 'Lead'} onChange={e => setField('status', e.target.value)}>
                    <option>Lead</option>
                    <option>Vundet</option>
                    <option>Tabt</option>
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="flex justify-end gap10 mt-3">
              {message && <span className="body-text" style={{ marginRight: 'auto' }}>{message}</span>}
              <button type="button" className="tf-button"
                      onClick={() => setForm(fromCompany(company))} disabled={saving}>
                Annuller
              </button>
              <button type="button" className="tf-button style-1"
                      onClick={handleSave} disabled={saving}>
                {saving ? 'Gemmer…' : 'Gem ændringer'}
              </button>
            </div>
          </div>

          {/* --- Tab 2: Kontakter --- */}
          <div className="widget-content-inner" style={{ display: tab === 2 ? 'block' : 'none' }}>
            <div className="flex justify-between items-center mb-16">
              <div className="body-title">
                Kontaktperson(er)
                <span className="body-text" style={{ marginLeft: 8 }}>
                  · Samlet ejerskab: {totalOwnership.toFixed(2)}%
                </span>
              </div>
              <button type="button" className="tf-button" onClick={addContact}>
                Tilføj kontakt
              </button>
            </div>

            {form.contacts.length === 0 && (
              <div className="body-text mb-10">Ingen kontakter tilføjet endnu.</div>
            )}

            <div className="flex flex-col gap-4">
              {form.contacts.map((c, idx) => (
                <div key={c.id} className="wg-box">
                  <div className="body-title mb-10">
                    Kontakt #{idx + 1}
                    {c._new && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: '2px 6px',
                        background: '#E5F5E8', color: '#0e7a2b', borderRadius: 4,
                      }}>NY</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" className="mb-8" placeholder="Navn" value={c.name || ''}
                           onChange={e => updateContact(c.id, { name: e.target.value })} />
                    <input type="email" className="mb-8" placeholder="Email" value={c.email || ''}
                           onChange={e => updateContact(c.id, { email: e.target.value })} />
                    <input type="text" className="mb-8" placeholder="Rolle (fx Indkøb)" value={c.role || ''}
                           onChange={e => updateContact(c.id, { role: e.target.value })} />
                    <input type="number" min={0} max={100} step={0.01}
                           placeholder="% ejerskab" value={c.ownershipPct ?? ''}
                           onChange={e => updateContact(c.id, {
                             ownershipPct: e.target.value === '' ? undefined : Number(e.target.value),
                           })} />
                  </div>
                  <div className="flex justify-end mt-3">
                    <button type="button" className="tf-button style-1"
                            onClick={() => removeContact(c.id)}>
                      Fjern
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap10 mt-3">
              {message && <span className="body-text" style={{ marginRight: 'auto' }}>{message}</span>}
              <button type="button" className="tf-button"
                      onClick={() => setForm(fromCompany(company))} disabled={saving}>
                Annuller
              </button>
              <button type="button" className="tf-button style-1"
                      onClick={handleSave} disabled={saving}>
                {saving ? 'Gemmer…' : 'Gem ændringer'}
              </button>
            </div>
          </div>

          {/* --- Tab 3: Noter --- */}
          <div className="widget-content-inner" style={{ display: tab === 3 ? 'block' : 'none' }}>
            <fieldset className="description mb-24">
              <div className="body-title mb-10">Interne noter</div>
              <textarea name="notes" placeholder="Skriv interne noter her…"
                        value={form.notes || ''}
                        onChange={e => setField('notes', e.target.value)} />
            </fieldset>

            <div className="flex justify-end gap10 mt-3">
              {message && <span className="body-text" style={{ marginRight: 'auto' }}>{message}</span>}
              <button type="button" className="tf-button"
                      onClick={() => setForm(fromCompany(company))} disabled={saving}>
                Annuller
              </button>
              <button type="button" className="tf-button style-1"
                      onClick={handleSave} disabled={saving}>
                {saving ? 'Gemmer…' : 'Gem ændringer'}
              </button>
            </div>
          </div>
        </div>
      </div>
     </div>
    </form>
  )
}

// Konverter company-objekt fra API til form-state
function fromCompany(c) {
  return {
    name:          c?.name || '',
    cvr:           c?.cvr || '',
    companyType:   c?.company_type || c?.companyType || '',
    industry:      c?.industry || '',
    vatRegistered: c?.vat_registered ?? c?.vatRegistered ?? true,
    ean:           c?.ean || '',
    phone:         c?.phone || '',
    email:         c?.email || '',
    website:       c?.website || '',
    address:       c?.address || '',
    zip:           c?.zip || '',
    city:          c?.city || '',
    country:       c?.country || 'Danmark',
    iban:          c?.iban || '',
    swift:         c?.swift || '',
    notes:         c?.notes || '',
    status:        c?.status || 'Lead',
    contacts: (c?.contacts || []).map(k => ({
      id:           k.id || crypto.randomUUID(),
      name:         k.name || '',
      email:        k.email || '',
      role:         k.role || '',
      ownershipPct: k.ownership_pct ?? k.ownershipPct ?? undefined,
    })),
  }
}

// =================================================================
// TOP PRODUKTER
// =================================================================
function TopProducts({ products }) {
  return (
    <div className="wg-box">
      <h5 className="mb-3">Top 5 mest købte produkter</h5>
      {products.length === 0 ? (
        <div className="body-text">Ingen ordrer endnu.</div>
      ) : (
        <ul className="flex flex-column gap10">
          {products.map((p) => (
            <li
              key={p.product_id}
              className="flex items-center justify-between"
              style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}
            >
              <div>
                <div className="body-title-2">{p.name}</div>
                <div className="text-xs text-gray-500">SKU: {p.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="body-title-2">{toNumber(p.total_quantity)} stk</div>
                <div className="text-xs text-gray-500">{formatDKK(p.total_revenue)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// =================================================================
// SENESTE ORDRER
// =================================================================
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
      background:    c.bg,
      color:         c.fg,
      padding:       '4px 12px',
      borderRadius:  12,
      fontSize:      12,
      fontWeight:    600,
      textTransform: 'capitalize',
      display:       'inline-block',
      whiteSpace:    'nowrap',
    }}>
      {c.label || status}
    </span>
  )
}

function RecentOrders({ orders }) {
  return (
    <div className="wg-box">
      <div className="flex items-center justify-between mb-3">
        <h5 style={{ marginBottom: 0 }}>Tidligere ordrer</h5>
        <span className="body-text">{orders.length} i alt</span>
      </div>

      {orders.length === 0 ? (
        <div className="body-text">Ingen ordrer endnu.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <th style={thStyle('left')}>Ordre</th>
              <th style={thStyle('left')}>Dato</th>
              <th style={thStyle('right')}>Total</th>
              <th style={thStyle('left')}>Status</th>
              <th style={{ ...thStyle('right'), width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle('left')}><strong>#{o.order_id}</strong></td>
                <td style={tdStyle('left')}>{formatDate(o.order_date)}</td>
                <td style={tdStyle('right')}>{formatDKK(o.subtotal_price)}</td>
                <td style={tdStyle('left')}><StatusPill status={o.status} /></td>
                <td style={tdStyle('right')}>
                  <Link href={`/order-detail/${o.id}`} title="Se ordre">
                    <i className="icon-eye" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const thStyle = (align) => ({
  textAlign:    align,
  padding:      '10px 12px',
  fontSize:     12,
  fontWeight:   600,
  color:        '#555',
  textTransform:'uppercase',
  letterSpacing: 0.4,
})
const tdStyle = (align) => ({
  textAlign: align,
  padding:   '14px 12px',
  fontSize:  14,
  color:     '#222',
  verticalAlign: 'middle',
})

// =================================================================
// PRISTABEL MED INLINE REDIGERING
// =================================================================
function PriceTable({ companyId, prices, onUpdated }) {
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  // Kun produkter med tildelt særpris
  const assigned = useMemo(
    () => prices.filter(p => p.has_special),
    [prices],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return assigned.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
  }, [assigned, query])

  // Produkter der ENDNU IKKE er tildelt (til "Tildel produkt"-modalen)
  const unassigned = useMemo(
    () => prices.filter(p => !p.has_special),
    [prices],
  )

  const save = async (row, newValue) => {
    const v = newValue.trim()
    setError(null)

    // tom -> slet special_price (nulstil til standard)
    if (v === '' || v === null) {
      setSavingId(row.product_id)
      try {
        const res = await fetch(
          `${API_BASE}/company/${companyId}/prices/${row.product_id}`,
          { method: 'DELETE' },
        )
        if (!res.ok) throw new Error('Kunne ikke nulstille pris')
        onUpdated(prices.map(p => p.product_id === row.product_id
          ? { ...p, special_price: null, has_special: false, effective_price: p.sale_price }
          : p))
      } catch (e) { setError(e.message) }
      finally { setSavingId(null) }
      return
    }

    const num = parseFloat(v.replace(',', '.'))
    if (!Number.isFinite(num) || num < 0) {
      setError('Ugyldig pris')
      return
    }
    // ingen ændring -> spring over
    if (Number(num).toFixed(2) === Number(row.special_price ?? -1).toFixed(2)) return

    setSavingId(row.product_id)
    try {
      const res = await fetch(
        `${API_BASE}/company/${companyId}/prices/${row.product_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ special_price: num }),
        },
      )
      if (!res.ok) throw new Error('Kunne ikke gemme pris')
      onUpdated(prices.map(p => p.product_id === row.product_id
        ? { ...p, special_price: num, has_special: true, effective_price: num }
        : p))
    } catch (e) { setError(e.message) }
    finally { setSavingId(null) }
  }

  return (
    <div className="wg-box">
      <div className="flex items-center justify-between gap10 flex-wrap mb-4">
        <h5 style={{ marginBottom: 0 }}>
          Kundens priser pr. produkt
          <span className="body-text" style={{ marginLeft: 8 }}>
            ({assigned.length} tildelt)
          </span>
        </h5>

        <div className="flex items-center gap10">
          <form className="form-search" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="name">
              <input
                type="text"
                placeholder="Søg produkt eller SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </fieldset>
          </form>
          <button
            type="button"
            className="tf-button style-1"
            onClick={() => setShowAssignModal(true)}
            title="Tildel et nyt produkt med særpris"
          >
            <i className="icon-plus" /> Tildel produkt
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <div className="table-responsive">
        <table className="price-table">
          <thead>
            <tr>
              <th>Produkt</th>
              <th>SKU</th>
              <th>Std. pris</th>
              <th>Kundens pris</th>
              <th>Sidst betalt</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => (
              <PriceRow
                key={row.product_id}
                row={row}
                saving={savingId === row.product_id}
                onSave={(v) => save(row, v)}
              />
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  {assigned.length === 0
                    ? 'Ingen produkter tildelt endnu. Klik på "Tildel produkt" for at komme i gang.'
                    : 'Ingen produkter matcher din søgning.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAssignModal && (
        <AssignProductModal
          products={unassigned}
          onClose={() => setShowAssignModal(false)}
          onAssign={(product, price) => {
            // Optimistisk opdatering når PUT lykkes - genbrug save-funktionen
            return save(product, String(price)).then(() => setShowAssignModal(false))
          }}
        />
      )}
    </div>
  )
}

// =================================================================
// MODAL: Tildel produkt med særpris
// =================================================================
function AssignProductModal({ products, onClose, onAssign }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
  }, [products, query])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!selected) { setError('Vælg et produkt'); return }
    const num = parseFloat(String(price).replace(',', '.'))
    if (!Number.isFinite(num) || num < 0) { setError('Indtast en gyldig pris'); return }
    setSaving(true)
    try {
      await onAssign(selected, num)
    } catch (e) {
      setError(e?.message || 'Kunne ikke tildele produkt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wg-box"
        style={{ width: 'min(640px, 92vw)', maxHeight: '85vh', overflow: 'auto', background: '#fff' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h5 style={{ marginBottom: 0 }}>Tildel produkt med særpris</h5>
          <button type="button" className="item" onClick={onClose} title="Luk">
            <i className="icon-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Søg i produkter */}
          <fieldset className="mb-3">
            <div className="body-title mb-10">Vælg produkt</div>
            <input
              type="text"
              placeholder="Søg på navn eller SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
            />
          </fieldset>

          {/* Liste over produkter at vælge fra */}
          <div
            style={{
              border: '1px solid #eee', borderRadius: 6,
              maxHeight: 260, overflowY: 'auto', marginBottom: 16,
            }}
          >
            {filtered.length === 0 && (
              <div className="body-text" style={{ padding: 16 }}>
                {products.length === 0
                  ? 'Alle produkter er allerede tildelt.'
                  : 'Ingen produkter matcher din søgning.'}
              </div>
            )}
            {filtered.map((p) => {
              const isSelected = selected?.product_id === p.product_id
              console.log(p)
              return (
                <div
                  key={p.product_id}
                  onClick={() => {
                    setSelected(p)
                    if (!price) setPrice(String(p.sale_price ?? ''))
                  }}
                  style={{
                    padding: 12, cursor: 'pointer',
                    background: isSelected ? '#f0f7ff' : '#fff',
                    borderBottom: '1px solid #f3f3f3',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 48, height: 48, flexShrink: 0,
                        borderRadius: 6, overflow: 'hidden',
                        background: '#f3f3f3',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <i className="icon-image" style={{ color: '#bbb' }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="body-title-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="body-text">Std. pris</div>
                    <div className="body-title-2">{formatDKK(p.sale_price)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pris */}
          <fieldset className="mb-3">
            <div className="body-title mb-10">
              Særpris (DKK) {selected && <span className="text-xs text-gray-500"> for {selected.name}</span>}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={selected ? `Std. pris: ${selected.sale_price}` : 'F.eks. 39.50'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!selected || saving}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
            />
          </fieldset>

          {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

          <div
            className="flex gap10"
            style={{ justifyContent: 'space-between', marginTop: 28 }}
          >
            <button type="button" className="tf-button" onClick={onClose} disabled={saving}>
              Annuller
            </button>
            <button type="submit" className="tf-button style-1" disabled={!selected || saving}>
              {saving ? 'Gemmer…' : 'Tildel produkt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------- En række i pristabellen ----------------
function PriceRow({ row, saving, onSave }) {
  const [value, setValue] = useState(
    row.special_price != null ? String(row.special_price) : ''
  )

  useEffect(() => {
    setValue(row.special_price != null ? String(row.special_price) : '')
  }, [row.special_price])

  const commit = () => onSave(value)

  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }

    if (e.key === 'Escape') {
      setValue(row.special_price != null ? String(row.special_price) : '')
      e.currentTarget.blur()
    }
  }

  return (
    <tr>
      <td>
        <strong>{row.name}</strong>
      </td>

      <td>{row.sku || '—'}</td>

      <td>{formatDKK(row.sale_price)}</td>

      <td>
        <div className="price-input-wrap">
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            placeholder={`Std. ${formatDKK(row.sale_price)}`}
            className={row.has_special ? 'price-input has-special' : 'price-input'}
          />

          {row.has_special && (
            <span className="special-badge">SÆR</span>
          )}

          {saving && <span className="text-xs">…</span>}
        </div>
      </td>

      <td>
        {row.last_purchase_price != null
          ? formatDKK(row.last_purchase_price)
          : '—'}
      </td>

      <td className="text-right">
        <button
          type="button"
          className="item trash"
          title="Nulstil til standardpris"
          disabled={!row.has_special || saving}
          onClick={() => onSave('')}
          style={{ opacity: row.has_special ? 1 : 0.3 }}
        >
          <i className="icon-trash-2" />
        </button>
      </td>
    </tr>
  )
}
