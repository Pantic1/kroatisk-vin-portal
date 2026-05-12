'use client'

import Layout from "@/components/layout/Layout"
import { useEffect, useMemo, useRef, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// ----------------- helpers -----------------
const toNum = (v) => {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const formatDKK = (n) =>
  Number.isFinite(+n)
    ? Number(n).toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })
    : '—'

// Slugify til auto-SKU: "Graševina 2024" -> "GRASEVINA-2024"
const slugify = (s) =>
  (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)

const emptyRow = () => ({
  // tracking
  _key: crypto.randomUUID(),
  status: 'idle',           // idle | saving | uploading | saved | error
  error: null,
  savedId: null,
  // form
  name: '',
  sku: '',
  skuAuto: true,            // SKU følger navn indtil bruger ændrer manuelt
  unit: '0,75 L',
  purchasePrice: '',
  salePrice: '',
  salePriceAuto: true,      // salgspris følger markup indtil bruger ændrer manuelt
  stock: '',
  qtyPerKoli: '6',
  description: '',
  imageUrl: '',
  imageUploading: false,
})

// =================================================================
// SIDE
// =================================================================
export default function BulkAddProductsPage() {
  const [rows, setRows]     = useState([emptyRow(), emptyRow(), emptyRow()])
  const [markup, setMarkup] = useState(40)       // %
  const [defaultUnit, setDefaultUnit] = useState('0,75 L')
  const [defaultKoli, setDefaultKoli] = useState('6')
  const [savingAll, setSavingAll] = useState(false)

  // ---------- afledte tællere ----------
  const counts = useMemo(() => {
    const c = { total: rows.length, saved: 0, error: 0, ready: 0 }
    rows.forEach(r => {
      if (r.status === 'saved') c.saved++
      else if (r.status === 'error') c.error++
      else if (r.name && toNum(r.purchasePrice) != null) c.ready++
    })
    return c
  }, [rows])

  // ---------- mutere én række ----------
  const updateRow = (key, patch) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r))
  }

  const handleField = (key, field, value) => {
    const patch = { [field]: value }

    // sync afhængigheder
    if (field === 'name') {
      const row = rows.find(r => r._key === key)
      if (row?.skuAuto) patch.sku = slugify(value)
    }
    if (field === 'sku') {
      patch.skuAuto = false
    }
    if (field === 'purchasePrice') {
      const row = rows.find(r => r._key === key)
      if (row?.salePriceAuto) {
        const p = toNum(value)
        patch.salePrice = p != null
          ? (p * (1 + markup / 100)).toFixed(2)
          : ''
      }
    }
    if (field === 'salePrice') {
      patch.salePriceAuto = false
    }
    updateRow(key, patch)
  }

  // ---------- recalc sale-priser når markup ændres ----------
  useEffect(() => {
    setRows(prev => prev.map(r => {
      if (!r.salePriceAuto) return r
      const p = toNum(r.purchasePrice)
      return p != null
        ? { ...r, salePrice: (p * (1 + markup / 100)).toFixed(2) }
        : r
    }))
  }, [markup])

  // ---------- billed-upload ----------
  const handleImage = async (key, file) => {
    if (!file) return
    updateRow(key, { imageUploading: true, error: null })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/uploads/upload/`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Billedupload fejlede')
      const data = await res.json()
      updateRow(key, { imageUrl: data.url, imageUploading: false })
    } catch (e) {
      updateRow(key, { imageUploading: false, error: e.message })
    }
  }

  // ---------- gem én række ----------
  const saveRow = async (key) => {
    const row = rows.find(r => r._key === key)
    if (!row) return
    if (!row.name) { updateRow(key, { status: 'error', error: 'Navn mangler' }); return }
    const pp = toNum(row.purchasePrice)
    const sp = toNum(row.salePrice)
    if (pp == null) { updateRow(key, { status: 'error', error: 'Indkøbspris mangler' }); return }
    if (sp == null) { updateRow(key, { status: 'error', error: 'Salgspris mangler' }); return }

    updateRow(key, { status: 'saving', error: null })

    const payload = {
      sku: row.sku || slugify(row.name) || `WINE-${Date.now()}`,
      name: row.name,
      description: row.description || row.name,
      purchase_price: pp,
      sale_price: sp,
      stock_quantity: parseInt(row.stock || '0', 10),
      qty_per_koli: row.qtyPerKoli ? parseInt(row.qtyPerKoli, 10) : null,
      unit: row.unit || 'stk',
      images: row.imageUrl ? [{ image_url: row.imageUrl }] : [],
    }

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      updateRow(key, { status: 'saved', savedId: data.id || true, error: null })
    } catch (e) {
      updateRow(key, { status: 'error', error: e.message })
    }
  }

  // ---------- gem alle (sekventielt så vi ikke spammer API) ----------
  const saveAll = async () => {
    setSavingAll(true)
    for (const r of rows) {
      if (r.status === 'saved') continue
      // eslint-disable-next-line no-await-in-loop
      await saveRow(r._key)
    }
    setSavingAll(false)
  }

  // ---------- ryd gemte rækker ----------
  const removeSaved = () => {
    setRows(prev => prev.filter(r => r.status !== 'saved'))
  }

  // ---------- række-ops ----------
  const addRow    = () => setRows(prev => [...prev, {
    ...emptyRow(),
    unit: defaultUnit,
    qtyPerKoli: defaultKoli,
  }])
  const removeRow = (key) => setRows(prev => prev.filter(r => r._key !== key))

  // ---------- render ----------
  return (
    <Layout breadcrumbTitleParent="Produkter" breadcrumbTitle="Hurtig oprettelse">
      {/* DEFAULTS / TOOLBAR */}
      <div className="wg-box mb-30">
        <div className="flex items-center gap20 flex-wrap">
          <fieldset>
            <div className="body-title mb-10">Markup %</div>
            <input
              type="number" min="0" step="1"
              value={markup}
              onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
              style={{ width: 90, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
            />
            <div className="text-xs text-gray-500 mt-1">Salgspris = indkøb × (1 + markup)</div>
          </fieldset>

          <fieldset>
            <div className="body-title mb-10">Standard enhed</div>
            <input
              type="text"
              value={defaultUnit}
              onChange={(e) => setDefaultUnit(e.target.value)}
              style={{ width: 110, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
            />
          </fieldset>

          <fieldset>
            <div className="body-title mb-10">Standard koli</div>
            <input
              type="number" min="1"
              value={defaultKoli}
              onChange={(e) => setDefaultKoli(e.target.value)}
              style={{ width: 90, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
            />
          </fieldset>

          <div style={{ flex: 1 }} />

          <div className="flex gap10">
            <button type="button" className="tf-button" onClick={addRow}>
              <i className="icon-plus" /> Tilføj række
            </button>
            <button
              type="button" className="tf-button"
              onClick={removeSaved}
              disabled={counts.saved === 0}
              title="Fjern alle gemte rækker fra listen"
            >
              Skjul gemte ({counts.saved})
            </button>
            <button
              type="button" className="tf-button style-1"
              onClick={saveAll}
              disabled={savingAll || counts.ready === 0}
            >
              {savingAll ? 'Gemmer…' : `Gem alle (${counts.ready})`}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-3">
          {counts.total} rækker · {counts.saved} gemt · {counts.error} fejl · {counts.ready} klar til at gemme
        </div>
      </div>

      {/* TABEL */}
      <div className="wg-box">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1.6fr 0.8fr 0.9fr 0.9fr 0.7fr 0.7fr 80px 32px',
            gap: 10, alignItems: 'center',
            paddingBottom: 8, marginBottom: 8,
            borderBottom: '1px solid #eee',
            fontWeight: 600, fontSize: 12, color: '#666',
          }}
        >
          <div>Billede</div>
          <div>Navn *</div>
          <div>Enhed</div>
          <div>Indkøb *</div>
          <div>Salg ({markup}%)</div>
          <div>Lager</div>
          <div>Koli</div>
          <div>Status</div>
          <div></div>
        </div>

        {rows.map((row) => (
          <ProductRow
            key={row._key}
            row={row}
            markup={markup}
            onField={(field, value) => handleField(row._key, field, value)}
            onImage={(file) => handleImage(row._key, file)}
            onSave={() => saveRow(row._key)}
            onRemove={() => removeRow(row._key)}
          />
        ))}

        {rows.length === 0 && (
          <div className="body-text" style={{ padding: 20 }}>
            Ingen rækker. Klik på "Tilføj række" for at starte.
          </div>
        )}
      </div>
    </Layout>
  )
}

// =================================================================
// EN RÆKKE
// =================================================================
function ProductRow({ row, markup, onField, onImage, onSave, onRemove }) {
  const fileInput = useRef(null)
  const saved   = row.status === 'saved'
  const saving  = row.status === 'saving'
  const error   = row.status === 'error'

  const rowBg = saved ? '#f0faf3'
              : error ? '#fdf1f1'
              : '#fff'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 1.6fr 0.8fr 0.9fr 0.9fr 0.7fr 0.7fr 80px 32px',
        gap: 10, alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #f3f3f3',
        background: rowBg,
      }}
    >
      {/* BILLEDE */}
      <div
        onClick={() => !saved && fileInput.current?.click()}
        style={{
          width: 56, height: 56, borderRadius: 6, overflow: 'hidden',
          background: '#f3f3f3', cursor: saved ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed #ddd',
        }}
        title={saved ? 'Gemt' : 'Klik for at uploade billede'}
      >
        {row.imageUploading ? (
          <span className="text-xs">…</span>
        ) : row.imageUrl ? (
          <img src={row.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <i className="icon-upload-cloud" style={{ color: '#aaa' }} />
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => onImage(e.target.files?.[0])}
          disabled={saved}
        />
      </div>

      {/* NAVN + SKU */}
      <div>
        <input
          type="text"
          placeholder="F.eks. Graševina 2024"
          value={row.name}
          disabled={saved}
          onChange={(e) => onField('name', e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="SKU (auto)"
          value={row.sku}
          disabled={saved}
          onChange={(e) => onField('sku', e.target.value)}
          style={{ ...inputStyle, marginTop: 4, fontSize: 11, color: '#666' }}
        />
      </div>

      {/* ENHED */}
      <input
        type="text" placeholder="0,75 L"
        value={row.unit} disabled={saved}
        onChange={(e) => onField('unit', e.target.value)}
        style={inputStyle}
      />

      {/* INDKØBSPRIS */}
      <input
        type="number" step="0.01" min="0" placeholder="67,01"
        value={row.purchasePrice} disabled={saved}
        onChange={(e) => onField('purchasePrice', e.target.value)}
        style={inputStyle}
      />

      {/* SALGSPRIS */}
      <input
        type="number" step="0.01" min="0" placeholder="auto"
        value={row.salePrice} disabled={saved}
        onChange={(e) => onField('salePrice', e.target.value)}
        style={{
          ...inputStyle,
          color: row.salePriceAuto ? '#0a7' : '#000',
          fontWeight: row.salePriceAuto ? 400 : 600,
        }}
        title={row.salePriceAuto ? `Auto-beregnet (+${markup}%)` : 'Manuelt sat'}
      />

      {/* LAGER */}
      <input
        type="number" min="0" placeholder="0"
        value={row.stock} disabled={saved}
        onChange={(e) => onField('stock', e.target.value)}
        style={inputStyle}
      />

      {/* KOLI */}
      <input
        type="number" min="1" placeholder="6"
        value={row.qtyPerKoli} disabled={saved}
        onChange={(e) => onField('qtyPerKoli', e.target.value)}
        style={inputStyle}
      />

      {/* STATUS / ACTION */}
      <div>
        {saved ? (
          <span style={{ color: '#0a7', fontSize: 12 }}>✓ Gemt</span>
        ) : saving ? (
          <span style={{ color: '#888', fontSize: 12 }}>Gemmer…</span>
        ) : error ? (
          <button
            type="button"
            onClick={onSave}
            style={{ ...btnStyle, background: '#c33', color: '#fff' }}
            title={row.error}
          >
            Prøv igen
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            style={{ ...btnStyle, background: '#1abf3e', color: '#fff' }}
            disabled={!row.name || !row.purchasePrice}
          >
            Gem
          </button>
        )}
        {error && row.error && (
          <div style={{ fontSize: 10, color: '#c33', marginTop: 2 }} title={row.error}>
            {row.error.slice(0, 40)}
          </div>
        )}
      </div>

      {/* SLET */}
      <button
        type="button"
        onClick={onRemove}
        title="Fjern række"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#999', fontSize: 16,
        }}
      >
        ×
      </button>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '6px 8px',
  border: '1px solid #ddd', borderRadius: 4,
  fontSize: 13,
}
const btnStyle = {
  padding: '6px 12px', border: 'none', borderRadius: 4,
  fontSize: 12, cursor: 'pointer',
}
