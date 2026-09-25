// Protections communes aux Edge Functions publiques :
// CORS strict, taille du corps, champ piège, délai minimal, limite de débit
// par IP hachée (compteurs séparés par type), Cloudflare Turnstile optionnel.

import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.108.2'

export const MAX_BODY_BYTES = 50 * 1024
export const MIN_FILL_MS = 5_000
export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000

export const GENERIC_ERROR = 'Une erreur est survenue. Merci de réessayer dans un instant.'

export const env = (name: string) => (Deno.env.get(name) ?? '').trim()

export function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Client service_role : contourne RLS, n'existe que côté serveur.
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------------------------------------------------------------- CORS

// Origines autorisées (ALLOWED_ORIGINS, séparées par des virgules).
// Liste vide = tout est refusé (échec sûr).
export function allowedOrigins(): string[] {
  return env('ALLOWED_ORIGINS')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

export function normalizeOrigin(origin: string | null): string {
  return (origin ?? '').trim().replace(/\/+$/, '')
}

export function isOriginAllowed(origin: string): boolean {
  return origin !== '' && allowedOrigins().includes(origin)
}

export function corsHeaders(origin: string, methods: string[]): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': [...methods, 'OPTIONS'].join(', '),
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export type Guarded =
  | { ok: true; cors: Record<string, string> }
  | { ok: false; response: Response }

// Vérifie l'origine et la méthode ; répond aux préflights (OPTIONS).
export function guardRequest(req: Request, methods: string[]): Guarded {
  const origin = normalizeOrigin(req.headers.get('origin'))
  if (!isOriginAllowed(origin)) {
    console.warn(`[guard] origine refusée : ${origin || '(aucune)'}`)
    return { ok: false, response: json({ ok: false, error: 'Origine non autorisée.' }, 403) }
  }
  const cors = corsHeaders(origin, methods)
  if (req.method === 'OPTIONS') {
    return { ok: false, response: new Response(null, { status: 204, headers: cors }) }
  }
  if (!methods.includes(req.method)) {
    return { ok: false, response: json({ ok: false, error: 'Méthode non autorisée.' }, 405, cors) }
  }
  return { ok: true, cors }
}

// ---------------------------------------------------------------- Corps

// Lit le corps en ne conservant que `max` octets. Le flux est vidé jusqu'au
// bout même s'il est trop gros : répondre sans le consommer bloque la
// passerelle (504) au lieu de renvoyer un 413 propre.
export async function readBodyLimited(
  req: Request,
  max = MAX_BODY_BYTES,
): Promise<{ text: string; tooLarge: boolean }> {
  if (!req.body) return { text: '', tooLarge: false }
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size <= max) chunks.push(value)
  }
  if (size > max) return { text: '', tooLarge: true }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.byteLength
  }
  return { text: new TextDecoder().decode(bytes), tooLarge: false }
}

// Lit un corps JSON objet de taille bornée, ou renvoie la réponse d'erreur.
export async function readJsonObject(
  req: Request,
  cors: Record<string, string>,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const { text, tooLarge } = await readBodyLimited(req)
  if (tooLarge) {
    return { ok: false, response: json({ ok: false, error: 'La requête est trop volumineuse.' }, 413, cors) }
  }
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return { ok: false, response: json({ ok: false, error: 'La requête est invalide.' }, 400, cors) }
  }
  if (!isPlainObject(body)) {
    return { ok: false, response: json({ ok: false, error: 'La requête est invalide.' }, 400, cors) }
  }
  return { ok: true, body }
}

// ---------------------------------------------------------------- Anti-spam

// Champ piège « website », invisible pour un humain : rempli = robot.
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.trim() !== ''
}

// startedAt et sentAt viennent tous deux de l'horloge du navigateur : l'écart
// ne dépend pas d'un éventuel décalage entre navigateur et serveur.
export function isHumanTiming(startedAt: unknown, sentAt: unknown): boolean {
  if (typeof startedAt !== 'number' || typeof sentAt !== 'number') return false
  if (!Number.isFinite(startedAt) || !Number.isFinite(sentAt)) return false
  return sentAt - startedAt >= MIN_FILL_MS
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    forwarded ||
    'inconnue'
  )
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Empreinte de l'IP (jamais stockée en clair).
export async function ipHashOf(req: Request): Promise<string> {
  const salt = env('RATE_LIMIT_SALT')
  if (!salt) console.warn('[guard] RATE_LIMIT_SALT absent : hachage sans sel')
  return await sha256Hex(`${clientIp(req)}${salt}`)
}

export type RateLimitKind = 'submit' | 'draft'

// Enregistre la tentative et renvoie false si la limite est atteinte.
// Compteurs séparés par type : un couple qui recommence plusieurs brouillons
// ne se bloque pas pour l'envoi de son menu.
export async function checkRateLimit(
  admin: SupabaseClient,
  ipHash: string,
  kind: RateLimitKind,
): Promise<boolean> {
  const now = Date.now()

  const purge = await admin
    .from('submission_log')
    .delete()
    .lt('created_at', new Date(now - LOG_RETENTION_MS).toISOString())
  if (purge.error) throw new Error(`purge submission_log : ${purge.error.message}`)

  const { count, error } = await admin
    .from('submission_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('kind', kind)
    .gte('created_at', new Date(now - RATE_LIMIT_WINDOW_MS).toISOString())
  if (error) throw new Error(`comptage submission_log : ${error.message}`)
  if ((count ?? 0) >= RATE_LIMIT_MAX) return false

  const insert = await admin.from('submission_log').insert({ ip_hash: ipHash, kind })
  if (insert.error) throw new Error(`insertion submission_log : ${insert.error.message}`)
  return true
}

// Vérifie le jeton Cloudflare Turnstile. Sans TURNSTILE_SECRET_KEY, la
// vérification est ignorée (renvoie true).
export async function passesTurnstile(req: Request, token: unknown): Promise<boolean> {
  const secret = env('TURNSTILE_SECRET_KEY')
  if (!secret) return true
  if (typeof token !== 'string' || token === '' || token.length > 2048) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  const ip = clientIp(req)
  if (ip !== 'inconnue') form.append('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Turnstile HTTP ${res.status}`)
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}

// Comparaison à temps constant (secrets).
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}
