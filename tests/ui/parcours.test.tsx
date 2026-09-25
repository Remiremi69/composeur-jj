// @vitest-environment jsdom
//
// Navigation du parcours dans un vrai routeur (en mémoire) : bouton retour
// du navigateur, accès direct à une étape non autorisée, écran groupé.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { Formule, Item, Step } from '@core/types'
import App from '../../src/App'
import { CatalogContext, type CatalogState } from '../../src/context/CatalogContext'
import { CompositionProvider } from '../../src/context/CompositionContext'

// Aucun appel aux Edge Functions pendant les tests.
vi.mock('../../src/lib/drafts', () => ({
  createDraft: vi.fn(async () => null),
  updateDraft: vi.fn(async () => 'ok'),
  fetchDraft: vi.fn(async () => ({ status: 'error' })),
  optOutOfReminders: vi.fn(async () => false),
}))

beforeAll(() => {
  // jsdom ne fournit ni matchMedia (framer-motion) ni scrollTo.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})

// --- Catalogue de test ------------------------------------------------------

function step(slug: string, position: number, extra: Partial<Step> = {}): Step {
  return {
    id: `s-${slug}`,
    slug,
    title: `Titre ${slug}`,
    subtitle: null,
    position,
    rule_type: 'pick_one',
    rule_min: 1,
    rule_max: 1,
    unit_label: null,
    ...extra,
  }
}

function item(id: string, name: string, stepSlug: string): Item {
  return {
    id,
    step_id: `s-${stepSlug}`,
    name,
    description: null,
    photo_url: null,
    price: 0,
    price_unit: 'par_personne',
    supplement: 0,
    labels: [],
    category: null,
    allergens: [],
    is_seasonal: false,
    season_note: null,
    is_active: true,
    position: 0,
  }
}

const assiette = { group_slug: 'assiette', group_title: 'Votre assiette', group_nav_title: 'Assiette' }
const steps: Step[] = [
  step('format', 0, { title: 'Votre format' }),
  step('boissons', 1, { rule_type: 'free', rule_min: null, rule_max: null }),
  step('plat', 2, { title: 'Votre plat', ...assiette }),
  step('feculent', 3, { title: 'Votre féculent', ...assiette }),
  step('legume', 4, { title: 'Votre légume', ...assiette }),
  step('dessert', 5, { title: 'Votre dessert' }),
]

const formule: Formule = {
  id: 'f1',
  slug: 'signature',
  name: 'Signature',
  subtitle: null,
  price_per_person: 100,
  included_steps: steps.map((s) => s.slug),
  highlights: [],
  step_rules: null,
  position: 0,
  is_active: true,
}

const items: Item[] = [
  item('i-format', 'Format Assis', 'format'),
  item('i-boisson', 'Citronnade', 'boissons'),
  item('i-plat', 'Plat Volaille', 'plat'),
  item('i-feculent', 'Gratin', 'feculent'),
  item('i-legume', 'Carottes', 'legume'),
  item('i-dessert', 'Tarte', 'dessert'),
]

const catalog: CatalogState = {
  formules: [formule],
  steps,
  items,
  options: [],
  inclusions: [],
  traiteurPhone: null,
  loading: false,
  error: null,
}

// --- Montage ----------------------------------------------------------------

function seed(state: { selections?: Record<string, number>; currentStep?: string | null }) {
  localStorage.setItem(
    'composeur:v3',
    JSON.stringify({
      couple: { coupleNames: 'Camille & Alex', email: 'c@exemple.fr', weddingDate: '2027-06-19', guestCount: 100 },
      formuleId: 'f1',
      selections: state.selections ?? {},
      optionIds: [],
      currentStep: state.currentStep ?? null,
    }),
  )
}

function mount(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [path] })
  render(
    <CatalogContext.Provider value={catalog}>
      <CompositionProvider>
        <RouterProvider router={router} />
      </CompositionProvider>
    </CatalogContext.Provider>,
  )
  return router
}

const title = () => screen.getByRole('heading', { level: 1 })
const nextButton = () => screen.getByRole('button', { name: 'Étape suivante' })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('parcours : une route par écran', () => {
  it('le bouton retour du navigateur revient à l’étape précédente, sans sortir du parcours', async () => {
    seed({ selections: { 'i-format': 1 } })
    const router = mount('/composer/format')
    expect(title().textContent).toBe('Votre format')

    fireEvent.click(nextButton())
    await waitFor(() => expect(router.state.location.pathname).toBe('/composer/assiette'))
    expect(title().textContent).toBe('Votre assiette')

    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/composer/format'))
    expect(title().textContent).toBe('Votre format')
  })

  it('accès direct à une étape pas encore autorisée : redirection vers la première étape à compléter', async () => {
    seed({})
    const router = mount('/composer/dessert')
    await waitFor(() => expect(router.state.location.pathname).toBe('/composer/format'))
    expect(title().textContent).toBe('Votre format')
  })

  it('une étape sans choix (boissons) n’est plus un écran', async () => {
    seed({ selections: { 'i-format': 1 } })
    const router = mount('/composer/boissons')
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/composer/boissons'))
  })

  it('/composer reprend à la dernière étape atteinte', async () => {
    seed({ selections: { 'i-format': 1 }, currentStep: 'assiette' })
    const router = mount('/composer')
    await waitFor(() => expect(router.state.location.pathname).toBe('/composer/assiette'))
  })
})

describe('parcours : écran groupé « Votre assiette »', () => {
  it('affiche les trois sections et n’autorise la suite que lorsqu’elles sont toutes valides', async () => {
    seed({ selections: { 'i-format': 1 } })
    const router = mount('/composer/assiette')
    expect(title().textContent).toBe('Votre assiette')

    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections).toEqual(expect.arrayContaining(['Votre plat', 'Votre féculent', 'Votre légume']))

    expect(nextButton()).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: /Plat Volaille/, pressed: false }))
    fireEvent.click(screen.getByRole('button', { name: /Gratin/, pressed: false }))
    expect(nextButton()).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: /Carottes/, pressed: false }))
    await waitFor(() => expect(nextButton()).toHaveProperty('disabled', false))

    fireEvent.click(nextButton())
    await waitFor(() => expect(router.state.location.pathname).toBe('/composer/dessert'))
  })
})
