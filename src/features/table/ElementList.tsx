import { CATEGORIES } from '../../domain/classification.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { formatMassShort } from '../../lib/format.ts'

interface Props {
  elements: readonly ElementRecord[]
  selected: number | null
  onSelect: (z: number) => void
}

/** Linear, filterable alternative to the grid. Easier on small screens and for screen readers. */
export function ElementList({ elements, selected, onSelect }: Props) {
  if (elements.length === 0) {
    return (
      <p role="status" className="rounded-lg border border-line bg-panel p-6 text-center text-muted">
        No elements match the current search and filters.
      </p>
    )
  }
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Elements">
      {elements.map((e) => (
        <li key={e.number}>
          <button
            type="button"
            data-cat={e.category}
            aria-current={selected === e.number ? 'true' : undefined}
            onClick={() => onSelect(e.number)}
            className="flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2 text-left hover:bg-panel-2 aria-[current=true]:border-white"
          >
            <span
              className="grid h-11 w-11 flex-none place-items-center rounded-md border-t-[3px] text-lg font-bold"
              style={{ borderColor: 'var(--cat)', background: 'color-mix(in oklab, var(--cat) 17%, var(--color-panel))' }}
              aria-hidden="true"
            >
              {e.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.name}</span>
              <span className="block truncate text-xs text-muted">
                {e.number} &middot; {CATEGORIES[e.category].label}
                {e.classificationBasis === 'predicted' ? ' (predicted)' : ''}
              </span>
            </span>
            <span className="flex-none font-mono text-xs text-muted">{formatMassShort(e)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
