'use client'

import Layout from "@/components/layout/Layout"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// Farvet pill pr. rolle
const ROLE_STYLE = {
  admin:    { bg: "#FFE5E5", fg: "#A8001A", label: "Admin" },
  staff:    { bg: "#E5F0FF", fg: "#0846A8", label: "Staff" },
  customer: { bg: "#E5F5E8", fg: "#1A6B2E", label: "Kunde" },
}
const RolePill = ({ role }) => {
  const c = ROLE_STYLE[(role || "").toLowerCase()] || { bg: "#EEE", fg: "#444", label: role }
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 600,
      display: "inline-block", whiteSpace: "nowrap",
    }}>
      {c.label || role}
    </span>
  )
}

const formatDate = (d) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("da-DK", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch { return d }
}

export default function AllUser() {
  const router = useRouter()
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [query, setQuery]   = useState("")
  const [loggingOut, setLoggingOut] = useState(false)

  // Hent brugere
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const res = await fetch(`${API_BASE}/users/`)
        if (!res.ok) throw new Error("Kunne ikke hente brugere")
        const data = await res.json()
        if (!cancelled) setUsers(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e.message || "Der skete en fejl")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return users.filter(u =>
      (u.username || "").toLowerCase().includes(q) ||
      (u.email    || "").toLowerCase().includes(q) ||
      (u.role     || "").toLowerCase().includes(q)
    )
  }, [users, query])

  const handleLogout = async () => {
    if (!confirm("Er du sikker på, at du vil logge ud?")) return
    setLoggingOut(true)
    try {
      await fetch("/api/logout", { method: "POST" })
      router.push("/login")
    } catch {
      alert("Kunne ikke logge ud. Prøv igen.")
      setLoggingOut(false)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm("Slet denne bruger?")) return
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Kunne ikke slette bruger")
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <Layout breadcrumbTitleParent="Bruger" breadcrumbTitle="Alle brugere">
      <div className="wg-box">
        <div className="flex items-center justify-between gap10 flex-wrap mb-4">
          <h5 style={{ marginBottom: 0 }}>
            Brugere
            <span className="body-text" style={{ marginLeft: 8 }}>
              ({filtered.length})
            </span>
          </h5>

          <div className="flex items-center gap10">
            <form className="form-search" onSubmit={(e) => e.preventDefault()}>
              <fieldset className="name">
                <input
                  type="text"
                  placeholder="Søg navn, email eller rolle…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </fieldset>
            </form>

            <Link className="tf-button style-1" href="/add-new-user">
              <i className="icon-plus" /> Opret bruger
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="tf-button"
              style={{
                background: "#A8001A",
                color: "#fff",
                border: "none",
                opacity: loggingOut ? 0.6 : 1,
              }}
              title="Log ud af systemet"
            >
              <i className="icon-log-out" />
              {loggingOut ? "Logger ud…" : "Log ud"}
            </button>
          </div>
        </div>

        {loading && <div className="body-text">Henter brugere…</div>}
        {error   && <div style={{ color: "red" }}>{error}</div>}

        {!loading && !error && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                <th style={th("left")}>Brugernavn</th>
                <th style={th("left")}>Email</th>
                <th style={th("left")}>Rolle</th>
                <th style={th("left")}>Oprettet</th>
                <th style={{ ...th("right"), width: 80 }}>Handling</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...td("left"), color: "#888", padding: 24 }}>
                    Ingen brugere fundet.
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={td("left")}><strong>{u.username}</strong></td>
                  <td style={td("left")}>{u.email || "—"}</td>
                  <td style={td("left")}><RolePill role={u.role} /></td>
                  <td style={td("left")}>{formatDate(u.created_at)}</td>
                  <td style={td("right")}>
                    <button
                      type="button"
                      onClick={() => deleteUser(u.id)}
                      className="item trash"
                      title="Slet bruger"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <i className="icon-trash-2" />
                    </button>
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
  textAlign: align, padding: "10px 12px", fontSize: 11, fontWeight: 600,
  color: "#666", textTransform: "uppercase", letterSpacing: 0.4,
})
const td = (align) => ({
  textAlign: align, padding: "14px 12px", fontSize: 14, color: "#222", verticalAlign: "middle",
})
