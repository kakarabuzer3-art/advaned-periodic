import { positionOf } from './layout.ts'

export const CATEGORY_IDS = [
  'alkali-metal',
  'alkaline-earth-metal',
  'transition-metal',
  'post-transition-metal',
  'metalloid',
  'reactive-nonmetal',
  'halogen',
  'noble-gas',
  'lanthanoid',
  'actinoid',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export interface CategoryInfo {
  id: CategoryId
  label: string
  /** One-sentence description. Hedged where the science is conventional. */
  description: string
}

export const CATEGORIES: Readonly<Record<CategoryId, CategoryInfo>> = {
  'alkali-metal': {
    id: 'alkali-metal',
    label: 'Alkali metals',
    description: 'Group 1 metals other than hydrogen. Soft and very reactive; they typically form +1 ions.',
  },
  'alkaline-earth-metal': {
    id: 'alkaline-earth-metal',
    label: 'Alkaline earth metals',
    description: 'Group 2 metals. Reactive, though less so than group 1; they typically form +2 ions.',
  },
  'transition-metal': {
    id: 'transition-metal',
    label: 'Transition metals',
    description:
      'The d-block metals in groups 3-12 as drawn here. Many have several common oxidation states and form coloured compounds.',
  },
  'post-transition-metal': {
    id: 'post-transition-metal',
    label: 'Post-transition metals',
    description:
      'Metals of the p-block. Generally softer and lower-melting than transition metals. The boundary with metalloids is a convention.',
  },
  metalloid: {
    id: 'metalloid',
    label: 'Metalloids',
    description:
      'Elements with properties between metals and nonmetals. Which elements count varies by source; B, Si, Ge, As, Sb and Te are the most common choice.',
  },
  'reactive-nonmetal': {
    id: 'reactive-nonmetal',
    label: 'Reactive nonmetals',
    description:
      'H, C, N, O, P, S and Se. A convention used here for nonmetals that are neither halogens nor noble gases. Hydrogen sits in group 1 but is not an alkali metal.',
  },
  halogen: {
    id: 'halogen',
    label: 'Halogens',
    description:
      'Group 17. Typically form -1 ions and salts with metals. Reactivity falls going down the group, with fluorine the most reactive.',
  },
  'noble-gas': {
    id: 'noble-gas',
    label: 'Noble gases',
    description:
      'Group 18. Very low chemical reactivity, consistent with filled outer shells. Heavier members form a small number of compounds.',
  },
  lanthanoid: {
    id: 'lanthanoid',
    label: 'Lanthanoids',
    description: 'The 15 elements La-Lu. Closely similar chemistry; the +3 oxidation state is the most common.',
  },
  actinoid: {
    id: 'actinoid',
    label: 'Actinoids',
    description: 'The 15 elements Ac-Lr. All are radioactive.',
  },
}

export interface Classification {
  category: CategoryId
  /** 'predicted' when the assignment rests on periodic-table position and theory, not on observed chemistry. */
  basis: 'established' | 'predicted'
  /** Present when the placement is disputed or convention-dependent. */
  note?: string
}

const NONMETALS = new Set([1, 6, 7, 8, 15, 16, 34])
const METALLOIDS = new Set([5, 14, 32, 33, 51, 52])
const POST_TRANSITION = new Set([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116])

/** Elements from here up have too little observed chemistry to confirm the category. */
const PREDICTED_FROM_Z = 109

export function classify(z: number): Classification {
  const basis: Classification['basis'] = z >= PREDICTED_FROM_Z ? 'predicted' : 'established'
  const { section, col } = positionOf(z)

  let category: CategoryId
  if (section === 'lanthanoid') category = 'lanthanoid'
  else if (section === 'actinoid') category = 'actinoid'
  else if (z === 1 || NONMETALS.has(z)) category = 'reactive-nonmetal'
  else if (METALLOIDS.has(z)) category = 'metalloid'
  else if (POST_TRANSITION.has(z)) category = 'post-transition-metal'
  else if (col === 1) category = 'alkali-metal'
  else if (col === 2) category = 'alkaline-earth-metal'
  else if (col === 17) category = 'halogen'
  else if (col === 18) category = 'noble-gas'
  else category = 'transition-metal'

  const result: Classification = { category, basis }
  const note = NOTES[z]
  if (note) result.note = note
  if (basis === 'predicted' && !note) {
    result.note = 'Too few atoms have been studied to confirm this category; it follows from the element\u2019s position and theory.'
  }
  return result
}

const NOTES: Readonly<Record<number, string>> = {
  1: 'Hydrogen is placed in group 1 but behaves unlike the alkali metals. Some tables place it above group 17 or on its own.',
  5: 'Boron is a metalloid in most schemes.',
  34: 'Selenium is classed as a nonmetal here; some sources call it a metalloid.',
  71: 'Group 3 membership is disputed. This table shows La-Lu as the lanthanoid row, so Lu sits there although its electron configuration is d-block. IUPAC\u2019s 2021 provisional recommendation puts Lu and Lr in group 3 under Sc and Y.',
  103: 'Group 3 membership is disputed. This table shows Ac-Lr as the actinoid row, so Lr sits there although its electron configuration is d-block. IUPAC\u2019s 2021 provisional recommendation puts Lu and Lr in group 3 under Sc and Y.',
  84: 'Polonium is classed as a post-transition metal here; some sources call it a metalloid.',
  85: 'Astatine is a halogen by group. Some sources class it as a metalloid; too little has been measured to settle this.',
  117: 'Tennessine is in group 17 but its chemistry is unknown. Calculations suggest it may be less halogen-like than the lighter members.',
  118: 'Oganesson is in group 18 but calculations suggest it may not behave like a typical noble gas, and may not be a gas. Few atoms have ever been made.',
  112: 'Copernicium sits in group 12 but calculations and limited experiments suggest it may be unusually volatile for a metal.',
}
