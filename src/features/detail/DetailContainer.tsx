import { useEffect, useId, useRef } from 'react'
import type { ElementRecord } from '../../domain/schema.ts'
import { DetailPanel } from './DetailPanel.tsx'

interface Props {
  element: ElementRecord | null
  /** True on wide screens: panel is docked beside the table. Otherwise it is a modal sheet. */
  docked: boolean
  onClose: () => void
}

export function DetailContainer({ element, docked, onClose }: Props) {
  const headingId = useId()

  if (docked) {
    return (
      <aside
        aria-label="Element details"
        className="sticky top-4 max-h-[calc(100vh-2rem)] self-start overflow-y-auto rounded-xl border border-line bg-panel"
      >
        {element ? (
          <DetailPanel element={element} onClose={onClose} headingId={headingId} />
        ) : (
          <div className="p-6 text-sm text-muted">
            <h2 className="mb-2 text-base font-semibold text-text">Select an element</h2>
            Choose any element in the table to see its structure, properties and background. Values the data does not cover are
            marked as missing, not guessed.
          </div>
        )}
      </aside>
    )
  }
  return <ModalSheet element={element} onClose={onClose} headingId={headingId} />
}

function ModalSheet({ element, onClose, headingId }: { element: ElementRecord | null; onClose: () => void; headingId: string }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (element && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (!element && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [element])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={headingId}
      onClose={onClose}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose() // click on the backdrop
      }}
    >
      <div className="mx-auto mt-6 max-h-[calc(100%-3rem)] w-[min(100%-1.5rem,40rem)] overflow-y-auto rounded-xl border border-line bg-panel">
        {element && <DetailPanel element={element} onClose={onClose} headingId={headingId} />}
      </div>
    </dialog>
  )
}
