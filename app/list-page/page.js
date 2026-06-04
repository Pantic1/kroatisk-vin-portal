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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px 80px',
                            padding: '0 12px 8px', borderBottom: '2px solid #f0f0f0',
                        }}>
                            <span style={colHead}>Navn</span>
                            <span style={colHead}>CVR</span>
                            <span style={colHead}>By</span>
                            <span style={colHead}>Status</span>
                            <span style={{ ...colHead, textAlign: 'right' }}>Handling</span>
                        </div>

                        {filtered.length === 0 && (
                            <div style={{ padding: '24px 12px', color: '#aaa', fontSize: 13 }}>
                                Ingen virksomheder fundet.
                            </div>
                        )}

                        {filtered.map((c, i) => (
                            <div
                                key={c.id}
                                onClick={() => router.push(`/company-details/${c.id}`)}
                                style={{
                                    display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px 80px',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'background .15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fafafa' : '#fff'}
                            >
                                {/* name + avatar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                        background: `hsl(${(c.name.charCodeAt(0) * 37) % 360} 55% 88%)`,
                                        color: `hsl(${(c.name.charCodeAt(0) * 37) % 360} 55% 35%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: 13,
                                    }}>
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.name}
                                    </span>
                                </div>

                                <div style={{ fontSize: 12, color: '#888' }}>{c.cvr || '—'}</div>
                                <div style={{ fontSize: 13, color: '#444' }}>{c.city || '—'}</div>
                                <div><StatusPill status={c.status} /></div>

                                {/* actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                    <Link
                                        href={`/company-details/${c.id}`}
                                        className="item edit"
                                        title="Se virksomhed"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <i className="icon-eye" style={{ fontSize: 20, color: '#0846A8' }} />
                                    </Link>
                                    <button
                                        type="button"
                                        className="item trash"
                                        title="Slet virksomhed"
                                        disabled={deletingId === c.id}
                                        onClick={(e) => deleteCompany(e, c.id, c.name)}
                                        style={{
                                            background: 'none', border: 'none',
                                            cursor: 'pointer',
                                            opacity: deletingId === c.id ? 0.5 : 1,
                                        }}
                                    >
                                        <i className="icon-trash-2" style={{ fontSize: 20, color: '#c0392b' }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    )
}

const colHead = {
    fontSize: 11, fontWeight: 700, color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
}
