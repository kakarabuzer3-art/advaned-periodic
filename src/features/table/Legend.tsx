import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../domain/classification.ts'

interface Props {
  active: ReadonlySet<CategoryId>
  counts: Readonly<Record<CategoryId, number>>
  onToggle: (c: CategoryId) => void
}

/** Category key that doubles as the category filter. */
export function Legend({ active, counts, onToggle }: Props) {
  return (
    <div role="group" aria-label="Filter by element category" className="flex flex-wrap content-start gap-1.5">
      {CATEGORY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className="legend-btn"
          data-cat={id}
          aria-pressed={active.has(id)}
          title={CATEGORIES[id].description}
          onClick={() => onToggle(id)}
        >
          {CATEGORIES[id].label}
          <span className="font-mono text-[0.65rem] text-muted">{counts[id]}</span>
        </button>
      ))}
    </div>
  )
}
