// @vitest-environment jsdom
// Origine d'une fiche : le ?source= d'un lien /reprendre/… ne doit JAMAIS
// écraser la source déjà enregistrée. Il ne sert qu'à la mesure d'audience.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { captureAttribution, getAttribution } from '../src/lib/attribution'
import { maskUrl } from '../src/lib/tracking'

function arriveOn(url: string) {
  sessionStorage.clear()
  window.history.replaceState(null, '', url)
  captureAttribution()
}

describe('provenance côté navigateur', () => {
  beforeEach(() => sessionStorage.clear())

  it('lien général ?source=salon : la provenance est retenue pour le nouveau menu', () => {
    arriveOn('/?source=salon')
    expect(getAttribution().source).toBe('salon')
  })

  it('lien personnel /reprendre/…?source=telephone : rien n’est retenu pour la fiche', () => {
    arriveOn('/reprendre/0f8c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f?source=telephone&utm_campaign=x')
    expect(getAttribution()).toEqual({ source: null, landingParams: null })
  })

  it('… mais la mesure d’audience garde la source (jeton masqué)', () => {
    expect(maskUrl('/reprendre/0f8c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f', '?source=telephone')).toBe('/reprendre/:token?source=telephone')
  })
})

// Garde-fou côté serveur : quoi que le navigateur envoie, la base garde la
// source déjà enregistrée (coalesce) et la sauvegarde d'un brouillon ne
// touche jamais à la source.
describe('provenance côté serveur', () => {
  // Fichiers lus depuis la racine du projet (environnement jsdom).
  const dir = resolve(process.cwd(), 'supabase/migrations')
  const latestSubmit = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(resolve(dir, f), 'utf8'))
    .filter((sql) => sql.includes('create or replace function public.submit_composition'))
    .pop() as string
  const body = latestSubmit.slice(latestSubmit.lastIndexOf('create or replace function public.submit_composition'))

  it('l’envoi d’un menu sur une fiche existante n’écrase pas sa source', () => {
    expect(body).toMatch(/source\s+=\s+coalesce\(c\.source, nullif\(p ->> 'source', ''\)\)/)
    expect(body).toMatch(/landing_params\s+=\s+coalesce\(c\.landing_params,/)
  })

  it('l’envoi accepte la fiche d’un contact ajouté à la main, sans menu', () => {
    expect(body).toContain("(c.status = 'draft' or (c.ajout_manuel and c.consent_at is null))")
  })

  it('la sauvegarde d’un brouillon ne modifie jamais la source', () => {
    const saveDraft = readFileSync(resolve(process.cwd(), 'supabase/functions/save-draft/index.ts'), 'utf8')
    const update = saveDraft.slice(saveDraft.indexOf('async function updateDraft'))
    expect(update).not.toMatch(/patch\.source|patch\.landing_params/)
  })
})
