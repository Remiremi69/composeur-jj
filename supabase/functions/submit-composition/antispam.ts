// Anti-spam : honeypot, délai minimal de remplissage, limite de débit par
// IP hachée, et Cloudflare Turnstile (optionnel).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

export const MIN_FILL_MS = 5_000 // délai minimal entre le début de la composition et l'envoi
export const RATE_LIMIT_MAX = 5 // soumissions max…
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // …par heure et par IP
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000 // purge des entrées de plus de 24 h

// Champ piège « website », invisible pour un humain : rempli = robot.
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.trim() !== ''
}

// startedAt et sentAt viennent tous deux de l'horloge du navigateur : l'écart
// ne dépend donc pas d'un éventuel décalage entre le navigateur et le serveur.
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

// Enregistre la tentative et renvoie false si la limite est atteinte.
// Chaque tentative arrivant jusqu'ici est comptée, qu'elle soit valide ou non.
export async function checkRateLimit(admin: SupabaseClient, ipHash: string): Promise<boolean> {
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
    .gte('created_at', new Date(now - RATE_LIMIT_WINDOW_MS).toISOString())
  if (error) throw new Error(`comptage submission_log : ${error.message}`)
  if ((count ?? 0) >= RATE_LIMIT_MAX) return false

  const insert = await admin.from('submission_log').insert({ ip_hash: ipHash })
  if (insert.error) throw new Error(`insertion submission_log : ${insert.error.message}`)
  return true
}

// Vérifie le jeton Cloudflare Turnstile auprès de l'API de Cloudflare.
export async function verifyTurnstile(secret: string, token: unknown, ip: string): Promise<boolean> {
  if (typeof token !== 'string' || token === '' || token.length > 2048) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip !== 'inconnue') form.append('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Turnstile HTTP ${res.status}`)
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}
