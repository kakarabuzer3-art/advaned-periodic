import { Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { searchGlossary } from './glossary.ts'
import { Term } from './Term.tsx'

export function LearnChemistry({ onNavigate }: { onNavigate: (d: 'start' | 'explore' | 'practice') => void }) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const terms = useMemo(() => searchGlossary(query), [query])

  return (
    <section aria-labelledby="learn-h" className="mx-auto max-w-3xl">
      <h2 id="learn-h" className="text-2xl font-bold">Learn Chemistry</h2>
      <p className="mt-1 text-sm text-muted">
        Plain-English explanations of the ideas used throughout this app. Every underlined word elsewhere in the app opens the same
        explanation. New to chemistry? Start with the{' '}
        <button type="button" className="underline" onClick={() => onNavigate('start')}>introduction</button>.
      </p>

      <div className="relative mt-5">
        <label htmlFor={inputId} className="sr-only">Search the glossary</label>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder="Search terms, for example isotope"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm placeholder:text-muted"
        />
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
        {query ? `${terms.length} matching term${terms.length === 1 ? '' : 's'}` : `${terms.length} terms`}
      </p>

      <ul className="mt-3 space-y-2" aria-label="Glossary">
        {terms.map((t) => (
          <li key={t.id}>
            <details className="group rounded-lg border border-line bg-panel">
              <summary className="cursor-pointer list-none px-4 py-3 marker:hidden">
                <span className="font-semibold">{t.term}</span>
                <span className="block text-sm text-muted">{t.short}</span>
              </summary>
              <div className="space-y-2 border-t border-line px-4 py-3 text-sm leading-relaxed">
                <p><strong className="font-semibold">In plain English: </strong>{t.plain}</p>
                <p><strong className="font-semibold">Example: </strong>{t.example}</p>
                {t.caution && <p className="rounded-md border border-warn/40 bg-warn/10 p-2"><strong className="font-semibold">Be careful: </strong>{t.caution}</p>}
                <p className="text-muted">
                  Related:{' '}
                  {t.related.map((r, i) => (
                    <span key={r}>{i > 0 && ', '}<Term id={r} /></span>
                  ))}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {terms.length === 0 && <p className="mt-4 rounded-lg border border-line bg-panel p-5 text-center text-muted">No terms match &ldquo;{query}&rdquo;.</p>}

      <div className="mt-8 rounded-xl border border-line bg-panel p-4 text-sm">
        <h3 className="font-semibold">Guided learning paths</h3>
        <p className="mt-1 text-muted">
          Structured multi-lesson paths (foundations, the periodic table, atomic behavior, advanced chemistry) are not built yet. For now,
          the introduction and the practice quizzes are the guided parts.{' '}
          <button type="button" className="underline" onClick={() => onNavigate('practice')}>Try a quiz</button> or{' '}
          <button type="button" className="underline" onClick={() => onNavigate('explore')}>explore the elements</button>.
        </p>
      </div>
    </section>
  )
}
