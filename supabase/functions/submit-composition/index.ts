// Edge Function : submit-composition
// Reçoit une composition, l'enregistre, génère un PDF récapitulatif
// et envoie un email (PDF en pièce jointe) aux mariés ET au traiteur.
//
// Tourne côté serveur Supabase (Deno). Utilise la clé service_role,
// qui n'arrive JAMAIS dans le navigateur. Aucune donnée métier en dur.
//
// Modèle de prix : forfait/personne de la formule + suppléments/personne.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const TRAITEUR_EMAIL = Deno.env.get('TRAITEUR_EMAIL') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Le Composeur <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Item {
  id: string
  step_id: string
  name: string
  description: string | null
  supplement: number
  position: number
}
interface Step {
  id: string
  title: string
  position: number
}
interface Formule {
  id: string
  name: string
  price_per_person: number
}
interface Option {
  id: string
  name: string
  price: number
  price_unit: 'par_personne' | 'forfait'
}
interface Payload {
  coupleNames: string
  email: string
  phone?: string
  weddingDate?: string
  guestCount: number
  formuleId: string
  selections: Record<string, number>
  optionIds?: string[]
}

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function clean(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
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
    const { coupleNames, email, phone, weddingDate, guestCount, formuleId, selections } = body
    const optionIds = body.optionIds ?? []

    if (!coupleNames || !email || !selections || Object.keys(selections).length === 0) {
      return json({ ok: false, error: 'Composition incomplète.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const itemIds = Object.keys(selections)

    const [{ data: steps }, { data: items }, { data: formule }, { data: options }] =
      await Promise.all([
        admin.from('steps').select('*').order('position', { ascending: true }),
        admin.from('items').select('*').in('id', itemIds),
        admin.from('formules').select('*').eq('id', formuleId).maybeSingle(),
        optionIds.length
          ? admin.from('options').select('*').in('id', optionIds)
          : Promise.resolve({ data: [] as Option[] }),
      ])
    if (!steps || !items) {
      return json({ ok: false, error: 'Catalogue introuvable.' }, 500)
    }

    // Prix : forfait/pers de la formule + suppléments/pers des plats choisis
    const supplements = (items as Item[]).reduce(
      (s, it) => s + ((selections[it.id] ?? 0) > 0 ? it.supplement ?? 0 : 0),
      0,
    )
    const perPerson = ((formule as Formule | null)?.price_per_person ?? 0) + supplements
    const guests = guestCount > 0 ? guestCount : 0
    const chosenOptions = (options ?? []) as Option[]
    const optionsSum = chosenOptions.reduce(
      (s, o) => s + (o.price_unit === 'par_personne' ? o.price * guests : o.price),
      0,
    )
    const total = perPerson * guests + optionsSum

    const { data: comp, error: compErr } = await admin
      .from('compositions')
      .insert({
        formule_id: formuleId || null,
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

    await admin.from('composition_items').insert(
      itemIds.map((item_id) => ({
        composition_id: comp.id,
        item_id,
        quantity: selections[item_id],
      })),
    )

    if (chosenOptions.length) {
      await admin.from('composition_options').insert(
        chosenOptions.map((o) => ({ composition_id: comp.id, option_id: o.id })),
      )
    }

    const pdfBytes = await buildPdf({
      coupleNames,
      weddingDate,
      guestCount,
      formuleName: (formule as Formule | null)?.name ?? '',
      perPerson,
      total,
      steps: steps as Step[],
      items: items as Item[],
      selections,
      options: chosenOptions,
    })
    const pdfB64 = encodeBase64(pdfBytes)

    const formuleName = (formule as Formule | null)?.name ?? ''
    const dateStr = weddingDate ? formatDate(weddingDate) : '—'

    // Menu en HTML (étapes dans l'ordre + options)
    let menuRows = ''
    for (const step of steps as Step[]) {
      const chosen = (items as Item[])
        .filter((it) => it.step_id === step.id && (selections[it.id] ?? 0) > 0)
        .sort((a, b) => a.position - b.position)
      if (!chosen.length) continue
      menuRows += `<p style="margin:14px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a7f74">${clean(step.title)}</p>`
      for (const it of chosen) {
        const sup = it.supplement > 0 ? ` (+ ${eur.format(it.supplement)}/pers)` : ''
        menuRows += `<p style="margin:0;font-size:15px;color:#2b2521">${clean(it.name)}${sup}</p>`
      }
    }
    if (chosenOptions.length) {
      menuRows += `<p style="margin:14px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a7f74">Options</p>`
      for (const o of chosenOptions) {
        const p =
          o.price_unit === 'par_personne'
            ? `${eur.format(o.price)}/pers`
            : `${eur.format(o.price)} forfait`
        menuRows += `<p style="margin:0;font-size:15px;color:#2b2521">${clean(o.name)} (${p})</p>`
      }
    }

    const traiteurHtml = `
      <div style="font-family:Arial,sans-serif;color:#2b2521;max-width:560px;margin:auto">
        <p style="text-transform:uppercase;letter-spacing:2px;color:#8c6a3f;font-size:13px">Le Composeur — J&amp;J Traiteur</p>
        <h1 style="font-family:Georgia,serif;font-size:22px;margin:4px 0 16px">Nouvelle demande de menu</h1>
        <table style="font-size:14px;line-height:1.7;border-collapse:collapse">
          <tr><td style="color:#8a7f74;padding-right:16px">Couple</td><td><strong>${clean(coupleNames)}</strong></td></tr>
          <tr><td style="color:#8a7f74">Date du mariage</td><td>${dateStr}</td></tr>
          <tr><td style="color:#8a7f74">Nombre de convives</td><td>${guestCount}</td></tr>
          <tr><td style="color:#8a7f74">Email des mariés</td><td><a href="mailto:${clean(email)}">${clean(email)}</a></td></tr>
          <tr><td style="color:#8a7f74">Formule</td><td>${clean(formuleName)}</td></tr>
          <tr><td style="color:#8a7f74">Estimation</td><td><strong>${eur.format(total)}</strong> (${eur.format(perPerson)}/pers)</td></tr>
        </table>
        <h2 style="font-family:Georgia,serif;font-size:18px;margin:22px 0 4px">Le menu</h2>
        ${menuRows}
        <p style="margin-top:22px;font-size:13px;color:#8a7f74">Le récapitulatif complet est également en pièce jointe (PDF).</p>
      </div>`

    const coupleHtml = `
      <div style="font-family:Arial,sans-serif;color:#2b2521;max-width:560px;margin:auto">
        <p style="text-transform:uppercase;letter-spacing:2px;color:#8c6a3f;font-size:13px">J&amp;J Traiteur</p>
        <h1 style="font-family:Georgia,serif;font-size:22px;margin:4px 0 12px">Merci ${clean(coupleNames)} !</h1>
        <p style="font-size:14px;line-height:1.6">Voici le récapitulatif de votre menu pour le ${dateStr} (${guestCount} convives).
        Cette estimation est indicative — votre traiteur J&amp;J reviendra vers vous pour confirmer le devis.</p>
        <h2 style="font-family:Georgia,serif;font-size:18px;margin:22px 0 4px">Votre menu</h2>
        ${menuRows}
        <p style="margin-top:18px;font-size:15px"><strong>Estimation : ${eur.format(total)}</strong></p>
        <p style="margin-top:14px;font-size:13px;color:#8a7f74">Le récapitulatif est aussi en pièce jointe (PDF).</p>
      </div>`

    const recipients = [
      { to: TRAITEUR_EMAIL, role: 'traiteur', html: traiteurHtml, subject: `Nouvelle demande de menu — ${coupleNames}` },
      { to: email, role: 'mariés', html: coupleHtml, subject: `Votre menu de mariage — ${coupleNames}` },
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
              subject: r.subject,
              html: r.html,
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

interface PdfData {
  coupleNames: string
  weddingDate?: string
  guestCount: number
  formuleName: string
  perPerson: number
  total: number
  steps: Step[]
  items: Item[]
  selections: Record<string, number>
  options: Option[]
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
      } else line = test
    }
    if (line) lines.push(line)
    return lines
  }

  ensure(26)
  center('VOTRE MENU', sans, 11, accent)
  y -= 34
  ensure(30)
  center(data.coupleNames, serifBold, 28)
  y -= 22
  const sub = [
    data.weddingDate ? formatDate(data.weddingDate) : '',
    `${data.guestCount} convives`,
    data.formuleName,
  ]
    .filter(Boolean)
    .join('  ·  ')
  center(sub, sans, 12, muted)
  y -= 34

  for (const step of data.steps) {
    const chosen = data.items
      .filter((it) => it.step_id === step.id && (data.selections[it.id] ?? 0) > 0)
      .sort((a, b) => a.position - b.position)
    if (chosen.length === 0) continue

    ensure(28)
    center(step.title.toUpperCase(), sans, 10, muted)
    y -= 20
    for (const it of chosen) {
      const suffix = it.supplement > 0 ? ` (+ ${eur.format(it.supplement)}/pers)` : ''
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

  if (data.options.length) {
    ensure(28)
    center('OPTIONS', sans, 10, muted)
    y -= 20
    for (const o of data.options) {
      const p =
        o.price_unit === 'par_personne'
          ? `${eur.format(o.price)}/pers`
          : `${eur.format(o.price)} forfait`
      ensure(20)
      center(`${o.name} (${p})`, serif, 15, ink)
      y -= 22
    }
    y -= 8
  }

  ensure(80)
  y -= 6
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: rgb(0.91, 0.87, 0.81),
  })
  y -= 24
  center(`${eur.format(data.perPerson)} par personne x ${data.guestCount} convives`, sans, 11, muted)
  y -= 26
  center(clean(eur.format(data.total)), serifBold, 22, ink)
  y -= 24
  center('Estimation indicative - votre traiteur J&J vous confirmera le devis definitif.', sans, 9, muted)

  return await doc.save()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
