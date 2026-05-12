'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// Farveskema pr. virksomheds-status
const STATUS_PILL = {
    lead:      { bg: '#FFF4E5', fg: '#A86600', label: 'Lead' },
    draft:     { bg: '#F0F0F0', fg: '#555555', label: 'Draft' },
    active:    { bg: '#E5F5E8', fg: '#1A6B2E', label: 'Aktiv' },
    published: { bg: '#E5F5E8', fg: '#1A6B2E', label: 'Aktiv' },
    inactive:  { bg: '#FFE5E5', fg: '#A8001A', label: 'Inaktiv' },
    archived:  { bg: '#EFE5FF', fg: '#5B21B6', label: 'Arkiveret' },
    prospect:  { bg: '#E5F0FF', fg: '#0846A8', label: 'Prospect' },
}
const StatusPill = ({ status }) => {
    const c = STATUS_PILL[(status || '').toLowerCase()] || { bg: '#EEE', fg: '#444', label: status || 'Draft' }
    return (
        <span style={{
            background: c.bg, color: c.fg,
            padding: '4px 12px', borderRadius: 12,
            fontSize: 12, fontWeight: 600,
            display: 'inline-block', whiteSpace: 'nowrap',
        }}>
            {c.label}
        </span>
    )
}

export default function ListPage() {
    const router = useRouter()
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [query, setQuery] = useState('')
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        ;(async () => {
            try {
                setLoading(true); setError(null)
                const res = await fetch(API_BASE + '/company/')
                if (!res.ok) throw new Error('Kunne ikke hente virksomheder')
                const data = await res.json()
                setCompanies(Array.isArray(data) ? data : [])
            } catch (err) {
                setError(err?.message || 'Der skete en fejl')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const filtered = useMemo(() => {
        const q = query.toLowerCase()
        return companies.filter(c =>
            [c.id, c.name, c.cvr, c.city, c.status]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(q)
        )
    }, [companies, query])

    const deleteCompany = async (e, id, name) => {
        // Stop event så vi ikke navigerer til detail-siden
        e.preventDefault()
        e.stopPropagation()

        if (!confirm(`Er du sikker på, at du vil slette "${name}"?`)) return
        setDeletingId(id)
        try {
            const res = await fetch(`${API_BASE}/company/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || 'Kunne ikke slette virksomheden')
            }
            setCompanies(prev => prev.filter(c => c.id !== id))
        } catch (err) {
            alert(err.message || 'Der skete en fejl ved sletning')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Layout breadcrumbTitleParent="Virksomheder" breadcrumbTitle="Alle virksomheder">
            <div className="wg-box">
                <div className="flex items-center justify-between gap10 flex-wrap mb-4">
                    <h5 style={{ marginBottom: 0 }}>
                        Virksomheder
                        <span className="body-text" style={{ marginLeft: 8 }}>({filtered.length})</span>
                    </h5>

                    <div className="flex items-center gap10">
                        <form className="form-search" onSubmit={(e) => e.preventDefault()}>
                            <fieldset className="name">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Søg efter virksomhed…"
                                />
                            </fieldset>
                        </form>

                        <Link className="tf-button style-1" href="/create-company">
                            <i className="icon-plus" /> Opret ny
                        </Link>
                    </div>
                </div>

                {loading && <div className="body-text">Henter virksomheder…</div>}
                {error && <div style={{ color: 'red' }}>{error}</div>}

                {!loading && !error && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                                <th style={th('left')}>Navn</th>
                                <th style={th('left')}>CVR</th>
                                <th style={th('left')}>By</th>
                                <th style={th('left')}>Status</th>
                                <th style={{ ...th('right'), width: 100 }}>Handling</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ ...td('left'), color: '#888', padding: 24 }}>
                                        Ingen virksomheder fundet.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((c) => (
                                <tr
                                    key={c.id}
                                    onClick={() => router.push(`/company-details/${c.id}`)}
                                    style={{
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <td style={td('left')}><strong>{c.name}</strong></td>
                                    <td style={td('left')}>{c.cvr || '—'}</td>
                                    <td style={td('left')}>{c.city || '—'}</td>
                                    <td style={td('left')}><StatusPill status={c.status} /></td>
                                    <td style={td('right')}>
                                        <div className="list-icon-function" style={{ justifyContent: 'flex-end' }}>
                                            <Link
                                                href={`/company-details/${c.id}`}
                                                className="item edit"
                                                title="Se virksomhed"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <i className="icon-eye" />
                                            </Link>
                                            <button
                                                type="button"
                                                className="item trash"
                                                title="Slet virksomhed"
                                                disabled={deletingId === c.id}
                                                onClick={(e) => deleteCompany(e, c.id, c.name)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: deletingId === c.id ? 0.5 : 1,
                                                }}
                                            >
                                                <i className="icon-trash-2" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Layout>
    )
}

const th = (align) => ({
    textAlign: align, padding: '10px 12px', fontSize: 11, fontWeight: 600,
    color: '#666', textTransform: 'uppercase', letterSpacing: 0.4,
})
const td = (align) => ({
    textAlign: align, padding: '14px 12px', fontSize: 14, color: '#222', verticalAlign: 'middle',
})
