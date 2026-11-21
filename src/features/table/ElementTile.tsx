import { memo } from 'react'
import type { ElementRecord } from '../../domain/schema.ts'
import { formatMassShort, tileLabel } from '../../lib/format.ts'

interface Props {
  element: ElementRecord
  selected: boolean
  dimmed: boolean
  tabbable: boolean
  onSelect: (z: number) => void
  onFocusTile: (z: number) => void
}

function ElementTileImpl({ element: e, selected, dimmed, tabbable, onSelect, onFocusTile }: Props) {
  return (
    <button
      type="button"
      className="tile"
      data-z={e.number}
      data-cat={e.category}
      data-dimmed={dimmed}
      data-predicted={e.classificationBasis === 'predicted'}
      aria-current={selected ? 'true' : undefined}
      aria-label={tileLabel(e)}
      tabIndex={tabbable ? 0 : -1}
      style={{ gridRow: e.position.row + 1, gridColumn: e.position.col + 1 }}
      onClick={() => onSelect(e.number)}
      onFocus={() => onFocusTile(e.number)}
    >
      {/* Explicit spaces keep the visible text "26 Fe Iron 55.845" matching the accessible name (WCAG 2.5.3). */}
      <span className="tile-z" aria-hidden="true">{e.number}</span>{' '}
      <span className="tile-sym" aria-hidden="true">{e.symbol}</span>{' '}
      <span className="tile-name" aria-hidden="true">{e.name}</span>{' '}
      <span className="tile-mass" aria-hidden="true">{formatMassShort(e)}</span>
    </button>
  )
}

export const ElementTile = memo(ElementTileImpl)
