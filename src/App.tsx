import { useCallback, useEffect, useState } from 'react'
import { datasetMeta } from './data/index.ts'
import { OWNER } from './config/owner.ts'
import { ExploreScreen } from './features/explore/ExploreScreen.tsx'
import { GlossaryProvider } from './features/learn/GlossaryProvider.tsx'
import { LearnChemistry } from './features/learn/LearnChemistry.tsx'
import { PracticeScreen } from './features/practice/PracticeScreen.tsx'
import { isOnboardingComplete } from './features/start/onboardingState.ts'
import { StartLearning } from './features/start/StartLearning.tsx'

type Destination = 'start' | 'explore' | 'learn' | 'practice'

const NAV: readonly { id: Destination; label: string }[] = [
  { id: 'start', label: 'Start Learning' },
  { id: 'explore', label: 'Explore Elements' },
  { id: 'learn', label: 'Learn Chemistry' },
  { id: 'practice', label: 'Practice & Test' },
]

function destinationFromHash(): Destination | null {
  if (/^#element=/.test(window.location.hash)) return 'explore'
  const m = /^#(start|explore|learn|practice)$/.exec(window.location.hash)
  return (m?.[1] as Destination | undefined) ?? null
}

export default function App() {
  const [dest, setDest] = useState<Destination>(() => destinationFromHash() ?? (isOnboardingComplete() ? 'explore' : 'start'))

  const navigate = useCallback((next: Destination) => {
    setDest(next)
    history.pushState(null, '', next === 'explore' ? window.location.pathname + window.location.search : `#${next}`)
    window.scrollTo?.({ top: 0 })
  }, [])

  useEffect(() => {
    const onPop = () => setDest(destinationFromHash() ?? 'explore')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <GlossaryProvider>
      <div className="mx-auto flex min-h-screen max-w-[1760px] flex-col px-3 sm:px-5">
        <header className="py-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Periodic Table Explorer</h1>
              <p className="mt-1 text-sm text-muted">Interactive chemistry learning laboratory &middot; 118 elements</p>
            </div>
            <nav aria-label="Main" className="w-full sm:w-auto">
              <ul className="flex flex-wrap gap-1.5">
                {NAV.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      aria-current={dest === n.id ? 'page' : undefined}
                      onClick={() => navigate(n.id)}
                      className="h-11 rounded-lg border border-line bg-panel px-4 text-sm hover:bg-panel-2 aria-[current=page]:border-text aria-[current=page]:bg-panel-2 aria-[current=page]:font-semibold"
                    >
                      {n.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-1 pb-4">
          {dest === 'start' && <StartLearning onNavigate={navigate} />}
          {dest === 'explore' && <ExploreScreen />}
          {dest === 'learn' && <LearnChemistry onNavigate={navigate} />}
          {dest === 'practice' && <PracticeScreen />}
        </main>

        <footer className="mt-10 border-t border-line py-6 text-xs leading-relaxed text-muted">
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
            <p className="max-w-3xl">
              Element data is compiled from several sources (CIAAW atomic weights, IUPAC and NUBASE2020 isotope data and NIST first ionization
              energies via the mendeleev package, plus a community dataset largely derived from Wikipedia), retrieved {datasetMeta.retrieved}. It has
              not been verified element by element against IUPAC or NIST. Values marked &ldquo;Predicted&rdquo; are theoretical. Check critical values
              against{' '}
              <a className="underline" href="https://www.nist.gov/pml/periodic-table-elements" target="_blank" rel="noreferrer noopener">NIST</a>,{' '}
              <a className="underline" href="https://www.ciaaw.org/atomic-weights.htm" target="_blank" rel="noreferrer noopener">CIAAW</a> or{' '}
              <a className="underline" href="https://iupac.org/what-we-do/periodic-table-of-elements/" target="_blank" rel="noreferrer noopener">IUPAC</a>.
            </p>
            <address className="not-italic">
              <span className="block font-semibold text-text">{OWNER.name}</span>
              <a className="underline" href={OWNER.phoneHref}>{OWNER.phoneDisplay}</a>
              {' · '}
              <a className="underline" href={OWNER.whatsappHref} target="_blank" rel="noreferrer noopener">WhatsApp</a>
              <br />
              <a className="underline" href={OWNER.emailHref}>{OWNER.email}</a>
            </address>
          </div>
        </footer>
      </div>
    </GlossaryProvider>
  )
}
