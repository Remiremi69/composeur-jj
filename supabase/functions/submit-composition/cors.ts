// CORS strict : seules les origines listées dans ALLOWED_ORIGINS
// (séparées par des virgules) peuvent appeler la fonction.
// Liste vide = tout est refusé (échec sûr).

export function allowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
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

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
