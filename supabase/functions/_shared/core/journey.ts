// Noyau métier partagé — le parcours de composition.
// Construit les ÉCRANS à partir des données : les étapes « incluses » (free)
// ne sont pas des écrans, et les étapes d'un même group_slug partagent un
// seul écran. Aucun slug n'est écrit en dur : tout vient de la table steps.

import { evaluateStep, itemsForStep, resolveStep, type RuleStatus } from './rules.ts'
import type { Formule, Item, Selections, Step } from './types.ts'

export interface Screen {
  slug: string // utilisé dans la route /composer/:slug (group_slug ou slug d'étape)
  title: string
  navTitle: string // nom court pour la frise
  subtitle: string | null // sous-titre (écran d'une seule étape)
  steps: Step[] // étapes de l'écran, avec les règles propres à la formule
}

export interface ScreenStatus {
  valid: boolean
  steps: { step: Step; status: RuleStatus }[]
}

// Étapes incluses dans la formule, dans l'ordre du repas.
export function includedSteps(formule: Formule | null, steps: Step[]): Step[] {
  const included = formule ? new Set(formule.included_steps) : null
  return steps
    .filter((s) => (included ? included.has(s.slug) : true))
    .sort((a, b) => a.position - b.position)
}

// Étapes « déjà comprises » (rien à choisir) : affichées dans un encart.
export function freeSteps(formule: Formule | null, steps: Step[]): Step[] {
  return includedSteps(formule, steps).filter((s) => s.rule_type === 'free')
}

export function buildScreens(formule: Formule | null, steps: Step[]): Screen[] {
  const screens: Screen[] = []
  const groups = new Map<string, Screen>()
  for (const raw of includedSteps(formule, steps)) {
    if (raw.rule_type === 'free') continue
    const step = resolveStep(raw, formule)
    if (step.group_slug) {
      let screen = groups.get(step.group_slug)
      if (!screen) {
        screen = {
          slug: step.group_slug,
          title: step.group_title || step.title,
          navTitle: step.group_nav_title || step.group_title || step.nav_title || step.title,
          subtitle: null,
          steps: [],
        }
        groups.set(step.group_slug, screen)
        screens.push(screen)
      }
      screen.steps.push(step)
    } else {
      screens.push({
        slug: step.slug,
        title: step.title,
        navTitle: step.nav_title || step.title,
        subtitle: step.subtitle,
        steps: [step],
      })
    }
  }
  return screens
}

export function screenStatus(screen: Screen, items: Item[], selections: Selections): ScreenStatus {
  const steps = screen.steps.map((step) => ({
    step,
    status: evaluateStep(step, itemsForStep(step, items), selections),
  }))
  return { valid: steps.every((s) => s.status.satisfied), steps }
}

// Index du premier écran non validé (screens.length si tout est validé).
export function firstInvalidIndex(screens: Screen[], items: Item[], selections: Selections): number {
  const idx = screens.findIndex((s) => !screenStatus(s, items, selections).valid)
  return idx === -1 ? screens.length : idx
}

// Dernier écran accessible : on ne peut pas dépasser le premier écran non validé.
export function maxReachableIndex(screens: Screen[], items: Item[], selections: Selections): number {
  return Math.min(firstInvalidIndex(screens, items, selections), screens.length - 1)
}

// Écran correspondant à une clé : slug d'écran, ou slug d'une de ses étapes.
export function screenIndexForKey(screens: Screen[], key: string | null | undefined): number {
  if (!key) return -1
  return screens.findIndex((s) => s.slug === key || s.steps.some((st) => st.slug === key))
}

export type RouteDecision = { kind: 'ok'; index: number } | { kind: 'redirect'; slug: string }

// Décide si la route /composer/:key peut être affichée, ou vers où rediriger :
// clé inconnue → premier écran ; écran pas encore accessible → premier écran
// non validé ; slug d'étape d'un groupe → adresse canonique du groupe.
export function resolveComposerRoute(
  screens: Screen[],
  key: string | null | undefined,
  items: Item[],
  selections: Selections,
): RouteDecision {
  const max = maxReachableIndex(screens, items, selections)
  const idx = screenIndexForKey(screens, key)
  if (idx < 0) return { kind: 'redirect', slug: screens[0].slug }
  if (idx > max) return { kind: 'redirect', slug: screens[max].slug }
  if (screens[idx].slug !== key) return { kind: 'redirect', slug: screens[idx].slug }
  return { kind: 'ok', index: idx }
}

// Écran d'entrée pour /composer sans slug : la dernière étape visitée
// (last_step) si elle est accessible, sinon le plus loin possible, sinon le
// premier. Gère aussi les anciennes valeurs (slug d'étape « incluse », pages
// options / récap).
export function entryScreenSlug(
  screens: Screen[],
  allSteps: Step[],
  lastStep: string | null | undefined,
  items: Item[],
  selections: Selections,
): string {
  const max = maxReachableIndex(screens, items, selections)
  let idx = screenIndexForKey(screens, lastStep)
  if (idx < 0 && lastStep) {
    const free = allSteps.find((s) => s.slug === lastStep)
    if (free) {
      // Étape « incluse » (plus un écran) : l'écran qui la suit.
      idx = screens.findIndex((sc) => sc.steps.some((st) => st.position > free.position))
      if (idx < 0) idx = screens.length - 1
    } else if (!['formule', 'accueil'].includes(lastStep)) {
      idx = screens.length - 1 // pages après la composition (options, récap)
    }
  }
  if (idx < 0) idx = 0
  return screens[Math.min(idx, max)].slug
}
