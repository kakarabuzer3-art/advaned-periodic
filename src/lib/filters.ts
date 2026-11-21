import type { Block } from '../domain/layout.ts'
import type { CategoryId } from '../domain/classification.ts'
import type { ElementRecord } from '../domain/schema.ts'
import { searchElements } from './search.ts'

export interface Filters {
  query: string
  categories: ReadonlySet<CategoryId>
  period: number | null
  group: number | null
  block: Block | null
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  categories: new Set(),
  period: null,
  group: null,
  block: null,
}

export function isFiltering(f: Filters): boolean {
  return f.query.trim() !== '' || f.categories.size > 0 || f.period !== null || f.group !== null || f.block !== null
}

/** Atomic numbers of every element that satisfies ALL active filters. */
export function matchingNumbers(list: readonly ElementRecord[], f: Filters): Set<number> {
  const queryHits = f.query.trim() === '' ? null : new Set(searchElements(f.query, list).map((e) => e.number))
  const out = new Set<number>()
  for (const e of list) {
    if (queryHits && !queryHits.has(e.number)) continue
    if (f.categories.size > 0 && !f.categories.has(e.category)) continue
    if (f.period !== null && e.period !== f.period) continue
    if (f.group !== null && e.group !== f.group) continue
    if (f.block !== null && e.block !== f.block) continue
    out.add(e.number)
  }
  return out
}
