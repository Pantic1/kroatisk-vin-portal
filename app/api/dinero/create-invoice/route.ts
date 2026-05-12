import { NextRequest, NextResponse } from 'next/server'

const DINERO_CLIENT_ID = process.env.DINERO_CLIENT_ID!
const DINERO_CLIENT_SECRET = process.env.DINERO_CLIENT_SECRET!
const DINERO_API_KEY = process.env.DINERO_API_KEY!
const DINERO_ORG_ID = process.env.DINERO_ORG_ID!
const DINERO_BASE = 'https://api.dinero.dk/v1'

type LineItem = { name: string; quantity: number; price: number; sku?: string; unit?: string; discount?: number; accountNumber?: number }
type Customer = { name: string; email?: string; address?: string; zip?: string; city?: string; countryKey?: string }

async function getDineroToken(): Promise<string> {
  const auth = Buffer.from(`${DINERO_CLIENT_ID}:${DINERO_CLIENT_SECRET}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'password',
    scope: 'read write',
    username: DINERO_API_KEY,
    password: DINERO_API_KEY,
  }).toString()

  const res = await fetch('https://authz.dinero.dk/dineroapi/oauth/token', {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Auth failed (${res.status})`)
  const data = await res.json()
  return data.access_token as string
}

// Finder eksisterende kontakt via email eller opretter ny
async function ensureContact(token: string, customer: Customer): Promise<string> {
  if (customer.email) {
    const qs = new URLSearchParams({ queryFilter: `Email+eq+'${customer.email}'` })
    const r = await fetch(`${DINERO_BASE}/${DINERO_ORG_ID}/contacts?${qs}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    if (r.ok) {
      const list = await r.json()
      if (Array.isArray(list?.Collection) && list.Collection.length) return list.Collection[0].Guid
    }
  }

  // Opret ny kontakt (minimumfelter)
  const payload = {
    Name: customer.name || customer.email || 'Webshop-kunde',
    Email: customer.email,
    Address1: customer.address,
    ZipCode: customer.zip,
    City: customer.city,
    CountryKey: customer.countryKey || 'DK',
    IsCustomer: true,
  }

  const cr = await fetch(`${DINERO_BASE}/${DINERO_ORG_ID}/contacts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!cr.ok) throw new Error(`Create contact failed (${cr.status}): ${await cr.text()}`)
  const c = await cr.json()
  return c?.Guid || c?.guid
}

export async function POST(req: NextRequest) {
  try {
    const { items, customer, externalReference, dueInDays = 8, showLinesInclVat = false, book = false } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 })
    }

    const token = await getDineroToken()
    const contactGuid = await ensureContact(token, customer || { name: 'Webshop-kunde' })

    const productLines = items.map((i: LineItem) => ({
      Description: i.name,
      Quantity: Number(i.quantity) || 1,
      AccountNumber: i.accountNumber ?? 1000, // standard salgskonto – tilsidesæt efter behov i Dinero
      Unit: i.unit ?? 'parts',                // skal være en værdi Dinero accepterer (fx 'hours','parts',...)
      Discount: i.discount ?? 0,
      LineType: 'Product',
      BaseAmountValue: Number(i.price) || 0,  // ekskl. moms hvis du viser moms særskilt i UI
    }))

    const today = new Date().toISOString().slice(0, 10)

    const invoicePayload = {
      Currency: 'DKK',
      Language: 'da-DK',
      ExternalReference: externalReference,
      Description: 'Webshop ordre',
      Date: today,
      ProductLines: productLines,
      Address: [customer?.address, customer?.zip, customer?.city].filter(Boolean).join(' '),
      ShowLinesInclVat: !!showLinesInclVat,
      ContactGuid: contactGuid,
      PaymentConditionNumberOfDays: dueInDays,
      PaymentConditionType: 'Netto',
    }

    // 1) Opret kladde-faktura
    const ir = await fetch(`${DINERO_BASE}/${DINERO_ORG_ID}/invoices`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(invoicePayload),
    })
    if (!ir.ok) return NextResponse.json({ error: 'Create invoice failed', details: await ir.text() }, { status: 400 })

    const created = await ir.json()
    const invoiceGuid = created?.Guid || created?.guid

    // 2) Valgfrit: bogfør
    let booked = false
    if (book && invoiceGuid) {
      const br = await fetch(`${DINERO_BASE}/${DINERO_ORG_ID}/invoices/${invoiceGuid}/book`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      })
      booked = br.ok
    }

    return NextResponse.json({ invoiceGuid, draft: !book, booked })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
