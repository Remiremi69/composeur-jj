// Noyau métier partagé — règles des options (site et serveur).
//
// • Options exclusives : les options d'un même `exclusive_group` s'excluent
//   (ex. mise en place du brunch : installation OU installation + service).
// • Options rattachées à une étape (option.category = slug de l'étape) :
//   sur une étape avec des choix, elles n'ont de sens que si au moins un plat
//   de l'étape est choisi (ex. pas de mise en place sans brunch). Sur une
//   étape « free » (fromage), tout est servi : pas de condition.

import type { Item, Option, Selections, Step } from './types.ts'

type OptionLike = Pick<Option, 'id' | 'category'> & { exclusive_group?: string | null }

// Coche / décoche une option ; cocher retire les autres options du même groupe.
export function toggleOptionId(options: OptionLike[], optionIds: string[], id: string): string[] {
  if (optionIds.includes(id)) return optionIds.filter((x) => x !== id)
  const group = options.find((o) => o.id === id)?.exclusive_group
  const rivals = group ? new Set(options.filter((o) => o.exclusive_group === group).map((o) => o.id)) : new Set()
  return [...optionIds.filter((x) => !rivals.has(x)), id]
}

// Étape à laquelle une option est rattachée, si elle exige un choix.
function requiredStep(option: OptionLike, steps: Step[]): Step | null {
  const step = steps.find((s) => s.slug === option.category)
  return step && step.rule_type !== 'free' ? step : null
}

function hasChoiceIn(step: Step, items: Pick<Item, 'id' | 'step_id'>[], selections: Selections): boolean {
  return items.some((it) => it.step_id === step.id && (selections[it.id] ?? 0) > 0)
}

// L'option peut-elle être choisie avec ces sélections ?
export function isOptionAvailable(
  option: OptionLike,
  steps: Step[],
  items: Pick<Item, 'id' | 'step_id'>[],
  selections: Selections,
): boolean {
  const step = requiredStep(option, steps)
  return !step || hasChoiceIn(step, items, selections)
}

// Retire les options devenues sans objet (étape vidée) et les doublons d'un
// groupe exclusif (on garde la dernière cochée).
export function pruneOptionIds(
  options: OptionLike[],
  steps: Step[],
  items: Pick<Item, 'id' | 'step_id'>[],
  selections: Selections,
  optionIds: string[],
): string[] {
  const byId = new Map(options.map((o) => [o.id, o]))
  const seenGroups = new Set<string>()
  const kept: string[] = []
  for (const id of [...optionIds].reverse()) {
    const option = byId.get(id)
    if (!option) {
      kept.push(id) // inconnue : laissée au nettoyage du catalogue
      continue
    }
    if (!isOptionAvailable(option, steps, items, selections)) continue
    if (option.exclusive_group) {
      if (seenGroups.has(option.exclusive_group)) continue
      seenGroups.add(option.exclusive_group)
    }
    kept.push(id)
  }
  return kept.reverse()
}
