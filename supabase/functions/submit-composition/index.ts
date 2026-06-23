// Edge Function : submit-composition
// Reçoit une composition, l'enregistre, génère un PDF récapitulatif
// et envoie un email (PDF en pièce jointe) aux mariés ET au traiteur.
//
// Tourne côté serveur Supabase (Deno). Utilise la clé service_role,
// qui n'arrive JAMAIS dans le navigateur. Aucune donnée métier en dur.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

// --- Configuration (injectée par Supabase / secrets) ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const TRAITEUR_EMAIL = Deno.env.get('TRAITEUR_EMAIL') ?? ''
// En bac à sable Resend, l'expéditeur doit être onboarding@resend.dev.
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Le Composeur <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// --- Types ---
interface Item {
  id: string
  step_id: string
  name: string
  description: string | null
  price: number
  price_unit: 'par_piece' | 'par_personne' | 'forfait'
  position: number
}
interface Step {
  id: string
  title: string
  position: number
  rule_type: string
}
interface Payload {
  coupleNames: string
  email: string
  phone?: string
  weddingDate?: string
  guestCount: number
  selections: Record<string, number> // item_id -> quantité
}

// --- Helpers ---
const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

// Nettoie le texte pour l'encodage WinAnsi de pdf-lib (guillemets typographiques,
// espaces insécables fines, tirets longs…).
function clean(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
}

function itemTotal(item: Item, qty: number, guests: number): number {
  const g = guests > 0 ? guests : 1
  switch (item.price_unit) {
    case 'par_personne':
      return item.price * g
    case 'par_piece':
      return item.price * qty * g
    case 'forfait':
      return item.price
    default:
      return 0
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405)

  try {
    const body = (await req.json()) as Payload
    const { coupleNames, email, phone, weddingDate, guestCount, selections } = body

    if (!coupleNames || !email || !selections || Object.keys(selections).length === 0) {
      return json({ ok: false, error: 'Composition incomplète.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const itemIds = Object.keys(selections)

    // 1. Récupère étapes + plats choisis (source de vérité = la base)
    const [{ data: steps }, { data: items }] = await Promise.all([
      admin.from('steps').select('*').order('position', { ascending: true }),
      admin.from('items').select('*').in('id', itemIds),
    ])
    if (!steps || !items) {
      return json({ ok: false, error: 'Catalogue introuvable.' }, 500)
    }

    // 2. Recalcule le total côté serveur (on ne fait pas confiance au client)
    let total = 0
    for (const it of items as Item[]) {
      total += itemTotal(it, selections[it.id] ?? 0, guestCount)
    }

    // 3. Enregistre la composition
    const { data: comp, error: compErr } = await admin
      .from('compositions')
      .insert({
        couple_names: coupleNames,
        email,
        phone: phone ?? null,
        wedding_date: weddingDate || null,
        guest_count: guestCount,
        status: 'submitted',
        total_estimate: total,
      })
      .select('id, share_token')
      .single()
    if (compErr || !comp) {
      return json({ ok: false, error: `Enregistrement impossible : ${compErr?.message}` }, 500)
    }

    const rows = itemIds.map((item_id) => ({
      composition_id: comp.id,
      item_id,
      quantity: selections[item_id],
    }))
    await admin.from('composition_items').insert(rows)

    // 4. Génère le PDF
    const pdfBytes = await buildPdf({
      coupleNames,
      weddingDate,
      guestCount,
      total,
      steps: steps as Step[],
      items: items as Item[],
      selections,
    })
    const pdfB64 = encodeBase64(pdfBytes)

    // 5. Envoie les emails (mariés + traiteur). Erreurs par destinataire non bloquantes.
    const subject = `Votre menu de mariage — ${coupleNames}`
    const recipients = [
      { to: TRAITEUR_EMAIL, role: 'traiteur' },
      { to: email, role: 'mariés' },
    ].filter((r) => r.to)

    const emailResults: Record<string, string> = {}
    if (RESEND_API_KEY) {
      for (const r of recipients) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: r.to,
              subject,
              html: emailHtml(coupleNames, r.role),
              attachments: [{ filename: 'menu-de-mariage.pdf', content: pdfB64 }],
            }),
          })
          emailResults[r.role] = res.ok ? 'envoyé' : `erreur (${await res.text()})`
        } catch (e) {
          emailResults[r.role] = `erreur (${String(e)})`
        }
      }
    } else {
      emailResults.info = 'RESEND_API_KEY absente — emails non envoyés'
    }

    return json({ ok: true, compositionId: comp.id, total, emailResults })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})

// --- Email HTML ---
function emailHtml(coupleNames: string, role: string): string {
  const intro =
    role === 'traiteur'
      ? `Nouvelle composition reçue de la part de ${clean(coupleNames)}.`
      : `Merci ${clean(coupleNames)} ! Voici le récapitulatif de votre menu.`
  return `
    <div style="font-family:Georgia,serif;color:#2b2521;max-width:520px;margin:auto">
      <p style="text-transform:uppercase;letter-spacing:2px;color:#8c6a3f;font-size:13px">J&J Traiteur</p>
      <h1 style="font-size:24px">Le Composeur</h1>
      <p style="font-family:Arial,sans-serif;line-height:1.5">${intro}</p>
      <p style="font-family:Arial,sans-serif;line-height:1.5">
        Le menu détaillé est en pièce jointe (PDF). Cette estimation est indicative —
        le devis définitif sera confirmé par le traiteur.
      </p>
    </div>`
}

// --- Génération PDF ---
interface PdfData {
  coupleNames: string
  weddingDate?: string
  guestCount: number
  total: number
  steps: Step[]
  items: Item[]
  selections: Record<string, number>
}

async function buildPdf(data: PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)

  const ink = rgb(0.17, 0.145, 0.129)
  const muted = rgb(0.54, 0.5, 0.45)
  const accent = rgb(0.55, 0.42, 0.25)

  const W = 595
  const H = 842
  const margin = 64
  const maxW = W - margin * 2

  let page = doc.addPage([W, H])
  let y = H - margin

  function ensure(space: number) {
    if (y - space < margin) {
      page = doc.addPage([W, H])
      y = H - margin
    }
  }

  function center(text: string, font: typeof serif, size: number, color = ink) {
    const t = clean(text)
    const w = font.widthOfTextAtSize(t, size)
    page.drawText(t, { x: (W - w) / 2, y, size, font, color })
  }

  function wrap(text: string, font: typeof serif, size: number): string[] {
    const words = clean(text).split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  // En-tête
  ensure(26)
  center('VOTRE MENU', sans, 11, accent)
  y -= 34
  ensure(30)
  center(data.coupleNames, serifBold, 28)
  y -= 22
  const sub = [
    data.weddingDate ? formatDate(data.weddingDate) : '',
    `${data.guestCount} convives`,
  ]
    .filter(Boolean)
    .join('  ·  ')
  center(sub, sans, 12, muted)
  y -= 34

  // Sections par étape
  for (const step of data.steps) {
    const chosen = data.items
      .filter((it) => it.step_id === step.id && (data.selections[it.id] ?? 0) > 0)
      .sort((a, b) => a.position - b.position)
    if (chosen.length === 0) continue

    ensure(28)
    center(step.title.toUpperCase(), sans, 10, muted)
    y -= 20

    for (const it of chosen) {
      const qty = data.selections[it.id] ?? 0
      const suffix = step.rule_type === 'exact_count' ? ` · ${qty} ${qty > 1 ? 'pièces' : 'pièce'}` : ''
      ensure(20)
      center(`${it.name}${suffix}`, serif, 15, ink)
      y -= 18
      if (it.description) {
        for (const line of wrap(it.description, sans, 10)) {
          ensure(14)
          center(line, sans, 10, muted)
          y -= 13
        }
      }
      y -= 8
    }
    y -= 12
  }

  // Total
  ensure(70)
  y -= 6
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: rgb(0.91, 0.87, 0.81),
  })
  y -= 26
  center('Estimation totale', sans, 11, muted)
  y -= 26
  center(clean(eur.format(data.total)), serifBold, 22, ink)
  y -= 24
  center('Estimation indicative — votre traiteur J&J vous confirmera le devis definitif.', sans, 9, muted)

  return await doc.save()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
