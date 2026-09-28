// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guestBracket, maskUrl, track, trackPageview } from '../src/lib/tracking'

afterEach(() => {
  delete window.plausible
  sessionStorage.clear()
})

describe('mesure d’audience', () => {
  it('masque les jetons des liens privés', () => {
    expect(maskUrl('/reprendre/306c2a9d-4de2-4a83-bd95-8a75d20be2e6')).toBe('/reprendre/:token')
    expect(maskUrl('/menu/306c2a9d-4de2-4a83-bd95-8a75d20be2e6')).toBe('/menu/:token')
    expect(maskUrl('/desinscription/abc')).toBe('/desinscription/:token')
    expect(maskUrl('/composer/assiette')).toBe('/composer/assiette')
  })

  it('ne garde que les paramètres de provenance', () => {
    expect(maskUrl('/', '?utm_source=instagram&email=a@b.fr&token=x')).toBe('/?utm_source=instagram')
  })

  it('tranches de convives', () => {
    expect(guestBracket(79)).toBe('<80')
    expect(guestBracket(80)).toBe('80-150')
    expect(guestBracket(150)).toBe('80-150')
    expect(guestBracket(151)).toBe('>150')
  })

  it('sans Plausible, ne fait rien (et ne plante pas)', () => {
    expect(() => track('Accueil vu')).not.toThrow()
    expect(() => trackPageview('/menu/abc', '')).not.toThrow()
  })

  it('ajoute la source à chaque événement et envoie des pages vues masquées', () => {
    const plausible = vi.fn()
    window.plausible = plausible
    sessionStorage.setItem('composeur:provenance', JSON.stringify({ source: 'instagram', landingParams: null }))
    track('Envoi', { formule: 'signature', convives: '80-150' })
    expect(plausible).toHaveBeenCalledWith('Envoi', {
      props: { source: 'instagram', formule: 'signature', convives: '80-150' },
    })
    trackPageview('/reprendre/abc-123', '')
    expect(plausible).toHaveBeenLastCalledWith('pageview', { u: `${window.location.origin}/reprendre/:token` })
  })

  it('source « direct » quand la provenance est inconnue', () => {
    const plausible = vi.fn()
    window.plausible = plausible
    track('Accueil vu')
    expect(plausible).toHaveBeenCalledWith('Accueil vu', { props: { source: 'direct' } })
  })
})
