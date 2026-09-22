import type { Formule, Item, Selections, Step } from '../types/db'

// Moteur de règles 100 % piloté par les données de la table `steps`.
// Aucune règle métier en dur : tout vient de rule_type / rule_min / rule_max.

// Applique la surcharge de règle éventuelle de la formule à une étape.
// Ex : l'étape "pièces cocktail" impose 4 pièces pour Signature, 8 pour Harmonie.
// Si la formule ne surcharge pas cette étape, on renvoie l'étape inchangée.
export function resolveStep(step: Step, formule: Formule | null): Step {
  const override = formule?.step_rules?.[step.slug]
  if (!override) return step
  return {
    ...step,
    rule_min: override.min ?? step.rule_min,
    rule_max: override.max ?? step.rule_max,
  }
}

export interface RuleStatus {
  current: number // pièces (exact_count) ou nombre de plats sélectionnés
  target: number | null // pour la jauge ; null si pas de cible
  satisfied: boolean // l'étape peut-elle être validée ?
  canAddMore: boolean // peut-on encore ajouter un plat ?
  label: string // texte affiché ("8 / 12 pièces choisies")
}

// Les plats appartenant à une étape, triés par position.
export function itemsForStep(step: Step, items: Item[]): Item[] {
  return items
    .filter((i) => i.step_id === step.id)
    .sort((a, b) => a.position - b.position)
}

function quantity(selections: Selections, id: string): number {
  return selections[id] ?? 0
}

// Compteur courant selon le type de règle.
function countForStep(step: Step, stepItems: Item[], selections: Selections): number {
  if (step.rule_type === 'exact_count') {
    // somme des quantités (nombre de pièces)
    return stepItems.reduce((sum, it) => sum + quantity(selections, it.id), 0)
  }
  // nombre de plats sélectionnés
  return stepItems.reduce((n, it) => n + (quantity(selections, it.id) > 0 ? 1 : 0), 0)
}

export function evaluateStep(
  step: Step,
  stepItems: Item[],
  selections: Selections,
): RuleStatus {
  const current = countForStep(step, stepItems, selections)
  const unit = step.unit_label ?? ''

  switch (step.rule_type) {
    case 'exact_count': {
      const target = step.rule_min ?? 0
      return {
        current,
        target,
        satisfied: current === target,
        canAddMore: true, // on peut ajuster librement, le bouton gère la validation
        label: `${current} / ${target} ${unit} choisies`,
      }
    }
    case 'pick_one': {
      return {
        current,
        target: 1,
        satisfied: current === 1,
        canAddMore: current < 1,
        label: current === 1 ? `Votre choix est fait` : `Choisissez 1 ${unit}`,
      }
    }
    case 'pick_range': {
      const min = step.rule_min ?? 0
      const max = step.rule_max ?? Number.MAX_SAFE_INTEGER
      return {
        current,
        target: step.rule_max ?? null,
        satisfied: current >= min && current <= max,
        canAddMore: current < max,
        label:
          min === max
            ? `${current} / ${max} ${unit}`
            : `${current} ${unit} choisi${current > 1 ? 's' : ''} (${min} à ${max})`,
      }
    }
    case 'free':
    default: {
      return {
        current,
        target: null,
        satisfied: true,
        canAddMore: true,
        label: 'Inclus dans votre formule',
      }
    }
  }
}

// Applique un tap sur un plat et renvoie les nouvelles sélections,
// en respectant la règle de l'étape (ex : pick_one remplace le choix).
export function toggleSelection(
  step: Step,
  stepItems: Item[],
  selections: Selections,
  item: Item,
): Selections {
  const next = { ...selections }
  const isSelected = quantity(next, item.id) > 0

  switch (step.rule_type) {
    case 'pick_one': {
      // Un seul choix : on efface les autres de l'étape.
      stepItems.forEach((it) => {
        delete next[it.id]
      })
      if (!isSelected) next[item.id] = 1
      return next
    }
    case 'pick_range': {
      const max = step.rule_max ?? Number.MAX_SAFE_INTEGER
      const count = stepItems.reduce(
        (n, it) => n + (quantity(next, it.id) > 0 ? 1 : 0),
        0,
      )
      if (isSelected) delete next[item.id]
      else if (count < max) next[item.id] = 1
      return next
    }
    case 'exact_count':
    case 'free':
    default: {
      if (isSelected) delete next[item.id]
      else next[item.id] = 1
      return next
    }
  }
}
