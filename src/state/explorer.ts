import type { Block } from '../domain/layout.ts'
import type { CategoryId } from '../domain/classification.ts'
import { EMPTY_FILTERS, type Filters } from '../lib/filters.ts'

export type ViewMode = 'table' | 'list'

export interface ExplorerState {
  filters: Filters
  /** Atomic number of the selected element. */
  selected: number | null
  view: ViewMode
}

export type Action =
  | { type: 'setQuery'; query: string }
  | { type: 'toggleCategory'; category: CategoryId }
  | { type: 'setPeriod'; period: number | null }
  | { type: 'setGroup'; group: number | null }
  | { type: 'setBlock'; block: Block | null }
  | { type: 'resetFilters' }
  | { type: 'select'; number: number | null }
  | { type: 'setView'; view: ViewMode }

export function initialState(view: ViewMode, selected: number | null = null): ExplorerState {
  return { filters: EMPTY_FILTERS, selected, view }
}

export function reducer(state: ExplorerState, action: Action): ExplorerState {
  switch (action.type) {
    case 'setQuery':
      return { ...state, filters: { ...state.filters, query: action.query } }
    case 'toggleCategory': {
      const categories = new Set(state.filters.categories)
      if (!categories.delete(action.category)) categories.add(action.category)
      return { ...state, filters: { ...state.filters, categories } }
    }
    case 'setPeriod':
      return { ...state, filters: { ...state.filters, period: action.period } }
    case 'setGroup':
      return { ...state, filters: { ...state.filters, group: action.group } }
    case 'setBlock':
      return { ...state, filters: { ...state.filters, block: action.block } }
    case 'resetFilters':
      return { ...state, filters: EMPTY_FILTERS }
    case 'select':
      return { ...state, selected: action.number }
    case 'setView':
      return { ...state, view: action.view }
  }
}
