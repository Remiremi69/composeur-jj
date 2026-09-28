// Notification instantanée d'un nouveau lead (n8n, ou tout autre outil).
//
// • Activée seulement si le secret N8N_WEBHOOK_URL est défini.
// • Ne bloque JAMAIS la réponse au couple : l'appel part en arrière-plan
//   (EdgeRuntime.waitUntil), avec un délai maximum de 3 secondes, et un échec
//   est seulement journalisé.
// • En-tête X-Webhook-Secret = N8N_WEBHOOK_SECRET, à vérifier côté n8n.

export type WebhookEvent = 'submitted' | 'draft_created'

export interface LeadSummary {
  event: WebhookEvent
  id: string
  prenoms: string
  telephone: string | null // absent pour un brouillon
  email: string
  date_mariage: string | null
  convives: number
  lieu: string | null // absent pour un brouillon
  formule: string | null
  estimation_par_personne: number | null
  estimation_totale: number | null
  source: string | null
  lien_admin: string | null
  recu_le: string
}

export function leadSummary(input: {
  event: WebhookEvent
  id: string
  coupleNames: string
  phone?: string | null
  email: string
  weddingDate: string | null
  guestCount: number
  venue?: string | null
  formuleName?: string | null
  perPerson?: number | null
  total?: number | null
  source: string | null
  appUrl: string | null // SITE_URL
  now?: Date
}): LeadSummary {
  const round = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100)
  return {
    event: input.event,
    id: input.id,
    prenoms: input.coupleNames,
    telephone: input.phone ?? null,
    email: input.email,
    date_mariage: input.weddingDate || null,
    convives: input.guestCount,
    lieu: input.venue ?? null,
    formule: input.formuleName ?? null,
    estimation_par_personne: round(input.perPerson),
    estimation_totale: round(input.total),
    source: input.source,
    // Le brouillon n'a pas de fiche : lien vers l'onglet des menus en cours.
    lien_admin: input.appUrl
      ? input.event === 'submitted'
        ? `${input.appUrl}/admin?demande=${input.id}`
        : `${input.appUrl}/admin`
      : null,
    recu_le: (input.now ?? new Date()).toISOString(),
  }
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

export const WEBHOOK_TIMEOUT_MS = 3000

// Envoie le résumé sans attendre. Renvoie la promesse (utile aux tests).
export function notifyWebhook(
  summary: LeadSummary,
  get: (name: string) => string,
  fetchFn: typeof fetch = fetch,
): Promise<void> | null {
  const url = get('N8N_WEBHOOK_URL')
  if (!url) return null
  const send = fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': get('N8N_WEBHOOK_SECRET') },
    body: JSON.stringify(summary),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  })
    .then((res) => {
      if (!res.ok) console.error(`[webhook] ${summary.event} : réponse ${res.status}`)
    })
    .catch((e) => console.error(`[webhook] ${summary.event} : échec (${e instanceof Error ? e.name : e})`))
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(send)
  return send
}
