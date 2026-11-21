import type { ReactNode } from 'react'
import { getTerm } from './glossary.ts'
import { useGlossary } from './glossaryContext.ts'

/** A word that opens its plain-English explanation. Unknown ids render as plain text rather than a dead button. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const { open } = useGlossary()
  const term = getTerm(id)
  if (!term) return <>{children ?? id}</>
  return (
    <button type="button" className="term" aria-haspopup="dialog" onClick={() => open(id)} title={`Explain: ${term.term}`}>
      {children ?? term.term}
    </button>
  )
}
