import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { getTerm } from './glossary.ts'
import { GlossaryContext } from './glossaryContext.ts'

function TermDialog({ id, onClose, onOpen }: { id: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const term = id ? getTerm(id) : undefined

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (term && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (!term && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [term])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={headingId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mx-auto mt-16 max-h-[calc(100%-5rem)] w-[min(100%-1.5rem,32rem)] overflow-y-auto rounded-xl border border-line bg-panel p-5">
        {term && (
          <article>
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Explain this simply</p>
                <h2 id={headingId} className="text-xl font-bold">{term.term}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close explanation" className="grid h-10 w-10 flex-none place-items-center rounded-lg border border-line bg-panel hover:bg-panel-2">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Definition</dt><dd>{term.short}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">In plain English</dt><dd>{term.plain}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted">Example</dt><dd>{term.example}</dd></div>
              {term.caution && (
                <div className="rounded-md border border-warn/40 bg-warn/10 p-2.5"><dt className="text-xs font-semibold uppercase tracking-wider">Be careful</dt><dd>{term.caution}</dd></div>
              )}
            </dl>
            {term.related.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Related ideas</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {term.related.map((r) => {
                    const rt = getTerm(r)
                    return rt ? (
                      <button key={r} type="button" onClick={() => onOpen(r)} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-sm hover:border-text">
                        {rt.term}
                      </button>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </dialog>
  )
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  const open = useCallback((next: string) => setId(next), [])
  const api = useMemo(() => ({ open }), [open])
  return (
    <GlossaryContext.Provider value={api}>
      {children}
      <TermDialog id={id} onClose={() => setId(null)} onOpen={open} />
    </GlossaryContext.Provider>
  )
}
