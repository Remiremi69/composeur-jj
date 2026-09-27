// Téléchargement du PDF d'un menu envoyé (Edge Function menu-pdf).
// Appel direct (fetch) : le client Supabase lirait la réponse comme du texte
// et abîmerait le fichier.
const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function downloadMenuPdf(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/functions/v1/menu-pdf?token=${encodeURIComponent(token)}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
    if (!res.ok || !res.headers.get('content-type')?.includes('application/pdf')) return false
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'menu-mariage-jj-traiteur.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
    return true
  } catch {
    return false
  }
}
