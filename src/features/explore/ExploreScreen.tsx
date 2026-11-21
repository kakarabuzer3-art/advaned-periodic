import { LayoutGrid, List, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { elements, getElementBySymbol } from '../../data/index.ts'
import { CATEGORY_IDS, type CategoryId } from '../../domain/classification.ts'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { isFiltering, matchingNumbers } from '../../lib/filters.ts'
import { searchElements } from '../../lib/search.ts'
import { initialState, reducer } from '../../state/explorer.ts'
import { DetailContainer } from '../detail/DetailContainer.tsx'
import { ElementList } from '../table/ElementList.tsx'
import { FilterBar } from '../table/FilterBar.tsx'
import { Legend } from '../table/Legend.tsx'
import { PeriodicTable } from '../table/PeriodicTable.tsx'

function selectedFromHash(): number | null {
  const m = /^#element=([A-Za-z]{1,2})$/.exec(window.location.hash)
  return (m?.[1] && getElementBySymbol(m[1])?.number) || null
}

export function ExploreScreen() {
  const wide = useMediaQuery('(min-width: 1280px)')
  const small = useMediaQuery('(max-width: 767px)')
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(window.matchMedia('(max-width: 767px)').matches ? 'list' : 'table', selectedFromHash()),
  )
  const { filters, selected, view } = state
  const searchRef = useRef<HTMLInputElement>(null)

  // Keep the URL hash and the selection in sync so an element can be shared or bookmarked.
  useEffect(() => {
    const el = selected ? elements[selected - 1] : null
    const wanted = el ? `#element=${el.symbol}` : ''
    if (window.location.hash !== wanted && (el || /^#element=/.test(window.location.hash))) {
      history.replaceState(null, '', wanted || window.location.pathname + window.location.search)
    }
  }, [selected])
  useEffect(() => {
    const onHash = () => {
      if (/^#element=/.test(window.location.hash)) dispatch({ type: 'select', number: selectedFromHash() })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filtering = isFiltering(filters)
  const matches = useMemo(() => matchingNumbers(elements, filters), [filters])
  const categoryCounts = useMemo(() => {
    const c = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0])) as Record<CategoryId, number>
    for (const e of elements) c[e.category]++
    return c
  }, [])
  const visible = useMemo(() => {
    const list = elements.filter((e) => matches.has(e.number))
    // When searching, the list view shows best matches first.
    if (filters.query.trim()) {
      const order = new Map(searchElements(filters.query, elements).map((e, i) => [e.number, i]))
      list.sort((a, b) => (order.get(a.number) ?? 0) - (order.get(b.number) ?? 0))
    }
    return list
  }, [matches, filters.query])

  const select = useCallback((z: number) => dispatch({ type: 'select', number: z }), [])
  const close = useCallback(() => dispatch({ type: 'select', number: null }), [])
  const toggleCategory = useCallback((category: CategoryId) => dispatch({ type: 'toggleCategory', category }), [])
  const selectedElement = selected ? (elements[selected - 1] ?? null) : null

  return (
    <section aria-labelledby="explore-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="explore-h" className="text-xl font-bold">Explore Elements</h2>
          <p className="mt-0.5 text-sm text-muted">Select any element to see its structure, isotopes and properties.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
            <label htmlFor="search" className="sr-only">Search elements by name, symbol or atomic number</label>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="search"
              ref={searchRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search elements"
              value={filters.query}
              onChange={(e) => dispatch({ type: 'setQuery', query: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // `visible` is already filtered and ordered by search rank, so Enter never opens a hidden element.
                  const top = visible[0]
                  if (top) select(top.number)
                } else if (e.key === 'Escape' && filters.query) {
                  dispatch({ type: 'setQuery', query: '' })
                }
              }}
              className="h-11 w-full rounded-lg border border-line bg-panel pl-9 pr-10 text-sm placeholder:text-muted hover:bg-panel-2"
            />
            {filters.query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { dispatch({ type: 'setQuery', query: '' }); searchRef.current?.focus() }}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-text"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div role="group" aria-label="View" className="flex overflow-hidden rounded-lg border border-line">
            {([['table', 'Table', LayoutGrid], ['list', 'List', List]] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => dispatch({ type: 'setView', view: v })}
                className="inline-flex h-11 items-center gap-2 bg-panel px-3.5 text-sm hover:bg-panel-2 aria-pressed:bg-panel-2 aria-pressed:font-semibold"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={filters}
          filtering={filtering}
          matchCount={matches.size}
          total={elements.length}
          onPeriod={(period) => dispatch({ type: 'setPeriod', period })}
          onGroup={(group) => dispatch({ type: 'setGroup', group })}
          onBlock={(block) => dispatch({ type: 'setBlock', block })}
          onReset={() => dispatch({ type: 'resetFilters' })}
        />
      </div>

      <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_25rem] items-start gap-5' : ''}>
        <div className="min-w-0">
          {view === 'table' ? (
            <>
              {small && <p className="mb-2 text-xs text-muted">Scroll sideways to see the whole table, or switch to List view.</p>}
              <PeriodicTable
                elements={elements}
                matches={matches}
                filtering={filtering}
                selected={selected}
                activeCategories={filters.categories}
                categoryCounts={categoryCounts}
                onSelect={select}
                onToggleCategory={toggleCategory}
              />
            </>
          ) : (
            <>
              <div className="mb-4">
                <Legend active={filters.categories} counts={categoryCounts} onToggle={toggleCategory} />
              </div>
              <ElementList elements={visible} selected={selected} onSelect={select} />
            </>
          )}
        </div>
        <DetailContainer element={selectedElement} docked={wide} onClose={close} />
      </div>
    </section>
  )
}
