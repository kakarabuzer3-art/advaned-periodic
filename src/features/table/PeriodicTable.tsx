import { useCallback, useState, type KeyboardEvent } from 'react'
import type { CategoryId } from '../../domain/classification.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { neighbor, type Direction } from '../../lib/gridNav.ts'
import { ElementTile } from './ElementTile.tsx'
import { Legend } from './Legend.tsx'

interface Props {
  elements: readonly ElementRecord[]
  matches: ReadonlySet<number>
  filtering: boolean
  selected: number | null
  activeCategories: ReadonlySet<CategoryId>
  categoryCounts: Readonly<Record<CategoryId, number>>
  onSelect: (z: number) => void
  onToggleCategory: (c: CategoryId) => void
}

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

const GROUPS = Array.from({ length: 18 }, (_, i) => i + 1)
const PERIODS = [1, 2, 3, 4, 5, 6, 7]

export function PeriodicTable(props: Props) {
  const { elements, matches, filtering, selected, onSelect } = props
  // Roving tabindex: exactly one tile is in the tab order, so Tab skips the other 117.
  const [focusZ, setFocusZ] = useState<number>(selected ?? 1)
  const handleFocus = useCallback((z: number) => setFocusZ(z), [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dir = KEY_TO_DIR[event.key]
    const z = Number((event.target as HTMLElement).closest<HTMLElement>('[data-z]')?.dataset.z)
    if (!dir || !Number.isInteger(z)) return
    const current = elements[z - 1]
    const target = current && neighbor(elements, current, dir)
    if (!target) return
    event.preventDefault()
    event.currentTarget.querySelector<HTMLElement>(`[data-z="${target.number}"]`)?.focus()
  }

  return (
    <div className="overflow-x-auto pb-2" tabIndex={-1}>
      {/* The group is a keyboard-navigable composite: arrow keys move between tiles. */}
      <div
        className="pt"
        role="group"
        aria-label="Periodic table of the elements. Use the arrow keys to move between elements."
        onKeyDown={onKeyDown}
      >
        {GROUPS.map((g) => (
          <span key={`g${g}`} className="pt-label" aria-hidden="true" style={{ gridRow: 1, gridColumn: g + 1 }}>{g}</span>
        ))}
        {PERIODS.map((p) => (
          <span key={`p${p}`} className="pt-label" aria-hidden="true" style={{ gridRow: p + 1, gridColumn: 1 }}>{p}</span>
        ))}

        <div style={{ gridRow: '2 / 5', gridColumn: '4 / 14' }} className="self-start">
          <Legend active={props.activeCategories} counts={props.categoryCounts} onToggle={props.onToggleCategory} />
        </div>

        <span className="marker" data-cat="lanthanoid" aria-hidden="true" style={{ gridRow: 7, gridColumn: 4 }}>57&ndash;71</span>
        <span className="marker" data-cat="actinoid" aria-hidden="true" style={{ gridRow: 8, gridColumn: 4 }}>89&ndash;103</span>

        {elements.map((e) => (
          <ElementTile
            key={e.number}
            element={e}
            selected={selected === e.number}
            dimmed={filtering && !matches.has(e.number)}
            tabbable={focusZ === e.number}
            onSelect={onSelect}
            onFocusTile={handleFocus}
          />
        ))}
      </div>
    </div>
  )
}
