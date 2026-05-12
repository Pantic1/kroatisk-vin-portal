'use client'
import React, { useState } from 'react'
import Layout from '@/components/layout/Layout'
const API_BASE = process.env.NEXT_PUBLIC_API_URL


export default function CompanyCreatePage() {
  const [tab, setTab] = useState(1)
  const [form, setForm] = useState({
    name: '',
    cvr: '',
    companyType: 'ApS',
    industry: '',
    vatRegistered: true,
    ean: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    zip: '',
    city: '',
    country: 'Danmark',
    iban: '',
    swift: '',
    notes: '',
    contacts: [],
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('Lead')
  const [message, setMessage] = useState('')

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // --- Kontakter
  const addContact = () => {
    const newContact = { id: crypto.randomUUID(), name: '', email: '', role: '', phone: '', ownershipPct: undefined }
    setForm(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }))
  }

  const removeContact = (id) => {
    setForm(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }))
  }

  const updateContact = (id, patch) => {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Påkrævet'
    if (!form.cvr.trim()) e.cvr = 'Påkrævet'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Ugyldig email'
    if (form.website && !/^https?:\/\//i.test(form.website)) e.website = 'Start med http(s)://'
    if (form.iban && form.iban.replaceAll(' ', '').length < 12) e.iban = 'For kort IBAN'

    // Total ejerskab må ikke overstige 100
    const totalOwnership = (form.contacts || []).reduce((sum, c) => sum + (c.ownershipPct || 0), 0)
    if (totalOwnership > 100 + 1e-6) e.ownership = 'Samlet ejerskab må ikke overstige 100%'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    setMessage('')
    if (!validate()) return

    try {
      setLoading(true)

      // Byg payload til API (kontakter uden phone)
      const payload = {
        name: form.name,
        cvr: form.cvr,
        companyType: form.companyType,
        industry: form.industry,
        vatRegistered: form.vatRegistered,
        ean: form.ean,
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: form.address,
        zip: form.zip,
        city: form.city,
        country: form.country,
        iban: form.iban,
        swift: form.swift,
        notes: form.notes,
        status, // FastAPI accepterer 'status' (default "Draft" hvis udeladt)
        // VIGTIGT: map contacts -> kontakter og strip phone
        kontakter: (form.contacts || []).map(c => ({
          name: c.name,
          email: c.email,
          role: c.role,
          ownershipPct: typeof c.ownershipPct === 'number' ? c.ownershipPct : undefined,
        })),
      }

      const res = await fetch(API_BASE + '/company/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let detail = 'Kunne ikke oprette virksomhed'
        try {
          const err = await res.json()
          if (err?.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
        } catch (_) {}
        throw new Error(detail)
      }

      const data = await res.json()
      setMessage(`Virksomheden er oprettet (id: ${data?.id ?? 'ukendt'}).`)
      // valgfrit: nulstil formularen
      // setForm(prev => ({ ...prev, contacts: [] }))
    } catch (err) {
      setMessage(err?.message || 'Der skete en fejl')
    } finally {
      setLoading(false)
    }
  }

  const fillFromCvr = (data) => {
    const industryStr =
      data?.industrycode && data?.industrydesc
        ? `${data.industrycode} - ${data.industrydesc}`
        : (data?.industrydesc || data?.industrycode || '')

    const contacts =
      Array.isArray(data?.owners) && data.owners.length > 0
        ? data.owners.map((o) => ({
            id: crypto.randomUUID(),
            name: o?.name || '',
            email: '',
            role: 'Kontakt',
            phone: '',
            ownershipPct: undefined,
          }))
        : undefined

    setForm(prev => ({
      ...prev,
      name: data?.name || prev.name,
      address: data?.address || prev.address,
      zip: String(data?.zipcode ?? prev.zip ?? ''),
      city: data?.city || prev.city,
      phone: data?.phone || prev.phone,
      email: data?.email || prev.email,
      website: data?.website
        ? (String(data.website).startsWith('http') ? data.website : `https://${data.website}`)
        : prev.website,
      industry: industryStr || prev.industry,
      companyType: data?.companydesc || prev.companyType,
      ...(contacts ? { contacts } : {}),
    }))
  }

  const lookupCVR = async () => {
    if (!form.cvr.trim()) {
      setErrors(prev => ({ ...prev, cvr: 'Indtast CVR' }))
      return
    }
    try {
      setLoading(true)
      setMessage('Slår CVR op…')
      const res = await fetch(`https://cvrapi.dk/api?country=dk&vat=${encodeURIComponent(form.cvr)}`)
      if (!res.ok) throw new Error('CVR slå-op fejlede')
      const data = await res.json()
      fillFromCvr(data)
      setMessage('CVR-data indlæst')
    } catch (err) {
      setMessage(err?.message || 'Kunne ikke hente CVR-data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Layout breadcrumbTitleParent="Virksomheder" breadcrumbTitle="Opret virksomhed">
        <form className="form-new-page" onSubmit={handleSubmit}>
          <div className="new-page-wrap">
            <div className="left">
              <div className="wg-box">
                <div className="widget-tabs">
                  <ul className="widget-menu-tab">
                    <li className={tab === 1 ? 'item-title active' : 'item-title'} onClick={() => setTab(1)}>
                      <span className="inner"><span className="h6">Stamdata</span></span>
                    </li>
                    <li className={tab === 2 ? 'item-title active' : 'item-title'} onClick={() => setTab(2)}>
                      <span className="inner"><span className="h6">Kontakter</span></span>
                    </li>
                    <li className={tab === 3 ? 'item-title active' : 'item-title'} onClick={() => setTab(3)}>
                      <span className="inner"><span className="h6">Noter</span></span>
                    </li>
                  </ul>

                  {/* --- Tab 1: Stamdata --- */}
                  <div className="widget-content-tab">
                    <div className="widget-content-inner active" style={{ display: `${tab === 1 ? 'block' : 'none'}` }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <fieldset className="mb-24">
                          <div className="body-title mb-10">CVR <span className="tf-color-1">*</span></div>
                          <div className="flex gap10 items-end">
                            <input
                              type="text"
                              placeholder="Fx 12345678"
                              name="cvr"
                              value={form.cvr}
                              onChange={e => setField('cvr', e.target.value.replace(/\D/g, ''))}
                              required
                            />
                            <button type="button" className="tf-button" onClick={lookupCVR} disabled={loading}>Slå op</button>
                          </div>
                          {errors.cvr && <div className="text-red-500 text-sm mt-1">{errors.cvr}</div>}
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Firmanavn <span className="tf-color-1">*</span></div>
                          <input type="text" placeholder="Navn" value={form.name} onChange={e => setField('name', e.target.value)} required />
                          {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Selskabsform</div>
                          <div className="select">
                            <select value={form.companyType} onChange={e => setField('companyType', e.target.value)}>
                              <option>Enkeltmandsvirksomhed</option>
                              <option>ApS</option>
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
                          <input type="text" placeholder="Fx 561010 - Restauranter" value={form.industry} onChange={e => setField('industry', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Telefon</div>
                          <input type="tel" placeholder="+45 …" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Email</div>
                          <input type="email" placeholder="kontakt@firma.dk" value={form.email} onChange={e => setField('email', e.target.value)} />
                          {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Website</div>
                          <input type="url" placeholder="https://firma.dk" value={form.website} onChange={e => setField('website', e.target.value)} />
                          {errors.website && <div className="text-red-500 text-sm mt-1">{errors.website}</div>}
                        </fieldset>

                        <fieldset className="mb-24 md:col-span-2">
                          <div className="body-title mb-10">Adresse</div>
                          <input type="text" placeholder="Adresse" value={form.address} onChange={e => setField('address', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Postnr.</div>
                          <input type="text" placeholder="0000" value={form.zip} onChange={e => setField('zip', e.target.value.replace(/\D/g, ''))} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">By</div>
                          <input type="text" placeholder="By" value={form.city} onChange={e => setField('city', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">Land</div>
                          <input type="text" placeholder="Land" value={form.country} onChange={e => setField('country', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">EAN-nummer</div>
                          <input type="text" placeholder="(valgfri)" value={form.ean} onChange={e => setField('ean', e.target.value)} />
                        </fieldset>

                        <fieldset className="mb-24">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.vatRegistered} onChange={e => setField('vatRegistered', e.target.checked)} />
                            <span className="body-title">Momsregistreret</span>
                          </label>
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">IBAN</div>
                          <input type="text" placeholder="DK.." value={form.iban} onChange={e => setField('iban', e.target.value)} />
                          {errors.iban && <div className="text-red-500 text-sm mt-1">{errors.iban}</div>}
                        </fieldset>

                        <fieldset className="mb-24">
                          <div className="body-title mb-10">SWIFT/BIC</div>
                          <input type="text" placeholder="NDEADKKK" value={form.swift} onChange={e => setField('swift', e.target.value)} />
                        </fieldset>
                      </div>
                    </div>

                    {/* --- Tab 2: Kontakter --- */}
                    <div className="widget-content-inner" style={{ display: `${tab === 2 ? 'block' : 'none'}` }}>
                      <div className="flex justify-between items-center mb-16">
                        <div className="body-title">Kontaktperson(er)</div>
                        <button type="button" className="tf-button" onClick={addContact}>Tilføj kontakt</button>
                      </div>
                      {form.contacts.length === 0 && (
                        <div className="body-text mb-10">Ingen kontakter tilføjet endnu.</div>
                      )}
                      <div className="flex flex-col gap-4">
                        {form.contacts.map((c, idx) => (
                          <div key={c.id} className="wg-box">
                            <div className="body-title mb-10">Kontakt #{idx + 1}</div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              <input type="text" className="mb-8" placeholder="Navn" value={c.name} onChange={e => updateContact(c.id, { name: e.target.value })} />
                              <input type="email" className="mb-8" placeholder="Email" value={c.email} onChange={e => updateContact(c.id, { email: e.target.value })} />
                              <input type="text" className="mb-8" placeholder="Rolle (fx Indkøb)" value={c.role} onChange={e => updateContact(c.id, { role: e.target.value })} />
                              <input type="tel" className="mb-8" placeholder="Telefon (intern)" value={c.phone} onChange={e => updateContact(c.id, { phone: e.target.value })} />
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="% ejerskab"
                                value={c.ownershipPct ?? ''}
                                onChange={e => updateContact(c.id, { ownershipPct: e.target.value === '' ? undefined : Number(e.target.value) })}
                              />
                            </div>
                            <div className="flex justify-end mt-3">
                              <button type="button" className="tf-button style-1" onClick={() => removeContact(c.id)}>Fjern</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {errors.ownership && <div className="text-red-500 text-sm mt-1">{errors.ownership}</div>}
                    </div>

                    {/* --- Tab 3: Noter --- */}
                    <div className="widget-content-inner" style={{ display: `${tab === 3 ? 'block' : 'none'}` }}>
                      <fieldset className="description mb-24">
                        <div className="body-title mb-10">Interne noter</div>
                        <textarea name="notes" placeholder="Skriv interne noter her…" value={form.notes} onChange={e => setField('notes', e.target.value)} />
                      </fieldset>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="right">
              <div className="wg-box">
                <div>
                  <div className="body-title mb-10">Handlinger</div>
                  <div className="flex gap10">
                    <button className="tf-button style-1 w-full" type="button" onClick={() => setStatus('Lead')}>Gem kladde</button>
                    <button className="tf-button w-full" type="submit" disabled={loading}>{loading ? 'Gemmer…' : 'Opret virksomhed'}</button>
                  </div>
                  {message && <div className="mt-2 text-sm opacity-80">{message}</div>}
                </div>
              </div>

              <div className="wg-box">
                <div>
                  <div className="body-title mb-10">Status</div>
                  <div className="select">
                    <select value={status} onChange={e => setStatus(e.target.value)}>
                      <option>Lead</option>
                      <option>Tabt</option>
                      <option>Vundet</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Layout>
    </>
  )
}
