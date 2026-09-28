import { describe, expect, it, vi } from 'vitest'
import { leadSummary, notifyWebhook, WEBHOOK_TIMEOUT_MS } from '../../supabase/functions/_shared/webhook.ts'

const now = new Date('2026-09-28T10:00:00Z')
const envOf = (vars: Record<string, string>) => (name: string) => vars[name] ?? ''

describe('résumé du lead', () => {
  it('menu envoyé : coordonnées, estimation arrondie et lien vers la fiche', () => {
    const s = leadSummary({
      event: 'submitted',
      id: 'abc',
      coupleNames: 'Camille & Alex',
      phone: '+33612345678',
      email: 'c@exemple.fr',
      weddingDate: '2027-06-19',
      guestCount: 100,
      venue: 'Domaine des Tilleuls',
      formuleName: 'Signature',
      perPerson: 135.456,
      total: 13545.6,
      source: 'instagram',
      appUrl: 'https://composer.j-jtraiteur.fr',
      now,
    })
    expect(s).toEqual({
      event: 'submitted',
      id: 'abc',
      prenoms: 'Camille & Alex',
      telephone: '+33612345678',
      email: 'c@exemple.fr',
      date_mariage: '2027-06-19',
      convives: 100,
      lieu: 'Domaine des Tilleuls',
      formule: 'Signature',
      estimation_par_personne: 135.46,
      estimation_totale: 13545.6,
      source: 'instagram',
      lien_admin: 'https://composer.j-jtraiteur.fr/admin?demande=abc',
      recu_le: '2026-09-28T10:00:00.000Z',
    })
  })

  it('brouillon : pas de téléphone, de lieu ni d’estimation', () => {
    const s = leadSummary({
      event: 'draft_created',
      id: 'd1',
      coupleNames: 'Léa',
      email: 'l@exemple.fr',
      weddingDate: '',
      guestCount: 80,
      source: null,
      appUrl: null,
      now,
    })
    expect(s.telephone).toBeNull()
    expect(s.lieu).toBeNull()
    expect(s.estimation_totale).toBeNull()
    expect(s.date_mariage).toBeNull()
    expect(s.lien_admin).toBeNull()
  })
})

describe('envoi au webhook', () => {
  const summary = leadSummary({
    event: 'submitted',
    id: 'abc',
    coupleNames: 'A',
    email: 'a@exemple.fr',
    weddingDate: null,
    guestCount: 100,
    source: null,
    appUrl: null,
    now,
  })

  it('sans N8N_WEBHOOK_URL : rien n’est envoyé', () => {
    const fetchFn = vi.fn()
    expect(notifyWebhook(summary, envOf({}), fetchFn as unknown as typeof fetch)).toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('POST JSON avec le secret en en-tête et un délai maximum', async () => {
    const fetchFn = vi.fn(async () => new Response('ok'))
    await notifyWebhook(
      summary,
      envOf({ N8N_WEBHOOK_URL: 'https://n8n.exemple.fr/webhook/lead', N8N_WEBHOOK_SECRET: 's3cret' }),
      fetchFn as unknown as typeof fetch,
    )
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://n8n.exemple.fr/webhook/lead')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Webhook-Secret': 's3cret' })
    expect(JSON.parse(init.body as string)).toEqual(summary)
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(WEBHOOK_TIMEOUT_MS).toBe(3000)
  })

  it('un échec (réseau, délai dépassé, erreur 500) ne remonte jamais', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const vars = envOf({ N8N_WEBHOOK_URL: 'https://n8n.exemple.fr/x' })
    await expect(
      notifyWebhook(summary, vars, (async () => {
        throw new DOMException('timeout', 'TimeoutError')
      }) as unknown as typeof fetch),
    ).resolves.toBeUndefined()
    await expect(
      notifyWebhook(summary, vars, (async () => new Response('', { status: 500 })) as unknown as typeof fetch),
    ).resolves.toBeUndefined()
    expect(err).toHaveBeenCalledTimes(2)
    err.mockRestore()
  })
})
