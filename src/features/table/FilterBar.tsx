import { RotateCcw } from 'lucide-react'
import { useId } from 'react'
import type { Block } from '../../domain/layout.ts'
import type { Filters } from '../../lib/filters.ts'

interface Props {
  filters: Filters
  filtering: boolean
  matchCount: number
  total: number
  onPeriod: (p: number | null) => void
  onGroup: (g: number | null) => void
  onBlock: (b: Block | null) => void
  onReset: () => void
}

const selectClass =
  'h-10 rounded-lg border border-line bg-panel px-2.5 text-sm text-text hover:bg-panel-2'

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">{label}</label>
      {children}
    </div>
  )
}

export function FilterBar({ filters, filtering, matchCount, total, onPeriod, onGroup, onBlock, onReset }: Props) {
  const uid = useId()
  const toNum = (v: string) => (v === '' ? null : Number(v))
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Table filters">
      <Field label="Period" id={`${uid}-p`}>
        <select id={`${uid}-p`} className={selectClass} value={filters.period ?? ''} onChange={(e) => onPeriod(toNum(e.target.value))}>
          <option value="">All</option>
          {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Group" id={`${uid}-g`}>
        <select id={`${uid}-g`} className={selectClass} value={filters.group ?? ''} onChange={(e) => onGroup(toNum(e.target.value))}>
          <option value="">All</option>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Block" id={`${uid}-b`}>
        <select id={`${uid}-b`} className={selectClass} value={filters.block ?? ''} onChange={(e) => onBlock((e.target.value || null) as Block | null)}>
          <option value="">All</option>
          {(['s', 'p', 'd', 'f'] as const).map((b) => <option key={b} value={b}>{b}-block</option>)}
        </select>
      </Field>
      <button
        type="button"
        onClick={onReset}
        disabled={!filtering}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw size={15} aria-hidden="true" />
        Reset filters
      </button>
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {filtering ? `${matchCount} of ${total} elements match` : `${total} elements`}
      </p>
    </div>
  )
}
