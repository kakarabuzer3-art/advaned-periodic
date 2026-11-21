import { useEffect, useMemo, useState } from 'react'
import { isotopesOf, loadIsotopes, weightedAtomicMass } from '../../data/isotopeLoader.ts'
import { DECAY_LABELS, HALF_LIFE_UNITS, defaultIsotope, formatHalfLife, neutronsOf, stabilityOf, type IsotopeFile, type Stability } from '../../domain/isotopes.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { formatUncertainty } from '../../lib/format.ts'
import { Term } from '../learn/Term.tsx'

const STABILITY_LABEL: Record<Stability, string> = {
  stable: 'Stable (no decay ever observed)',
  radioactive: 'Radioactive',
  unmeasured: 'Not established (very short-lived or unbound; no half-life measured)',
}
const STABILITY_MARK: Record<Stability, string> = { stable: '\u25CF', radioactive: '\u25B2', unmeasured: '\u25CB' }

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-x-3 border-b border-line/60 py-1.5 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

export function IsotopeExplorer({ element }: { element: ElementRecord }) {
  const [file, setFile] = useState<IsotopeFile | null>(null)
  const [failed, setFailed] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    loadIsotopes().then((f) => alive && setFile(f)).catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [])

  const list = useMemo(() => (file ? isotopesOf(file, element.number) : []), [file, element.number])
  const selected = list.find((i) => i.a === chosen) ?? defaultIsotope(list)
  const average = useMemo(() => weightedAtomicMass(list), [list])

  if (failed) return <p role="alert" className="py-2 text-sm text-warn">Isotope data could not be loaded. The rest of this panel still works.</p>
  if (!file) return <p role="status" className="py-2 text-sm text-muted">Loading isotope data&hellip;</p>
  if (!selected) return <p className="py-2 text-sm italic text-muted">No isotope data for this element.</p>

  const stability = stabilityOf(selected)
  const neutrons = neutronsOf(selected.a, element.number)
  const observed = selected.decay.filter((d) => d.observed)
  const name = `${element.name}-${selected.a}`

  return (
    <div>
      <p className="text-sm text-muted">
        {list.length} known <Term id="isotope">isotopes</Term> of {element.name}. Choose one to see its numbers.
        <span className="ml-1">{STABILITY_MARK.stable} stable, {STABILITY_MARK.radioactive} radioactive, {STABILITY_MARK.unmeasured} not established.</span>
      </p>
      {element.noStableIsotope && (
        <p className="mt-2 rounded-md border border-warn/40 bg-warn/10 p-2 text-xs leading-relaxed">
          {element.number === 83
            ? 'Strictly, bismuth has no stable isotope: bismuth-209 is radioactive, but its half-life is more than a billion times the age of the universe, so it behaves as stable in practice.'
            : `${element.name} has no stable isotope: every known isotope is radioactive.`}
        </p>
      )}
      <div role="group" aria-label={`Isotopes of ${element.name}`} className="mt-2 flex flex-wrap gap-1">
        {list.map((i) => {
          const s = stabilityOf(i)
          const on = i.a === selected.a
          return (
            <button
              key={i.a} type="button" aria-pressed={on}
              aria-label={`${element.name}-${i.a}, ${(STABILITY_LABEL[s].split(' (')[0] ?? '').toLowerCase()}${i.abundance !== null ? ', occurs naturally' : ''}`}
              onClick={() => setChosen(i.a)}
              className={`min-h-9 min-w-11 rounded-md border px-2 text-sm hover:border-text ${on ? 'border-text bg-panel-2 font-bold' : 'border-line bg-panel'}`}
            >
              <span aria-hidden="true" className="mr-1 text-[0.65rem]">{STABILITY_MARK[s]}</span>{i.a}
            </button>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3">
        <h4 className="text-base font-bold" aria-live="polite">{name}</h4>
        <dl className="mt-1">
          <Row label={<Term id="mass-number">Mass number</Term>}>{selected.a} <span className="text-muted">(protons + neutrons)</span></Row>
          <Row label={<Term id="proton">Protons</Term>}>{element.number}</Row>
          <Row label={<Term id="neutron">Neutrons</Term>}>
            <strong>{neutrons}</strong> <span className="text-muted">= mass number &minus; atomic number = {selected.a} &minus; {element.number}</span>
          </Row>
          <Row label={<Term id="electron">Electrons</Term>}>
            {element.number} <span className="text-muted">in a neutral atom. An <Term id="ion">ion</Term> has gained or lost electrons.</span>
          </Row>
          <Row label="Isotope mass">
            {selected.mass} u{selected.massUnc !== null && selected.massUnc > 0 ? <span className="text-muted"> &plusmn; {formatUncertainty(selected.massUnc)}</span> : null}
            <span className="block text-xs text-muted">The measured mass of one atom of this isotope, not a whole number.</span>
          </Row>
          <Row label="Natural abundance">
            {selected.abundance !== null ? `${selected.abundance} %` : <span className="text-muted">Does not occur naturally</span>}
          </Row>
          <Row label="Stability">{STABILITY_LABEL[stability]}</Row>
          <Row label={<Term id="half-life">Half-life</Term>}>
            {selected.halfLife ? (
              <>{formatHalfLife(selected.halfLife)} <span className="text-muted">({HALF_LIFE_UNITS[selected.halfLife.unit].long})</span></>
            ) : stability === 'stable' ? <span className="text-muted">Not applicable (no decay observed)</span> : <span className="italic text-muted">Not established</span>}
          </Row>
          <Row label={<Term id="radioactive-decay">Decay</Term>}>
            {observed.length ? (
              <ul>{observed.map((d, k) => (
                <li key={k}>{DECAY_LABELS[d.mode] ?? d.mode}{d.intensity !== null ? ` (${d.intensity} %)` : ''}</li>
              ))}</ul>
            ) : selected.decay.length ? (
              <span className="text-muted">None observed. Some modes are energetically allowed but have never been seen.</span>
            ) : <span className="text-muted">{stability === 'stable' ? 'None' : 'Not established'}</span>}
          </Row>
          <Row label="Nuclear spin">{selected.spin ?? <span className="italic text-muted">Not established</span>}</Row>
        </dl>
        <p className="mt-2 text-xs text-muted">Data: IUPAC mass evaluation (masses) and NUBASE2020 (half-lives, decay, abundance), via the mendeleev package.</p>
      </div>

      <details className="mt-3 rounded-lg border border-line p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Three different &ldquo;masses&rdquo;: why they are not the same</summary>
        <ul className="mt-2 space-y-2 leading-relaxed">
          <li><strong><Term id="mass-number">Mass number</Term></strong> counts protons plus neutrons in one isotope. It is a whole number ({selected.a} for {name}).</li>
          <li><strong>Isotope mass</strong> is the measured mass of one atom of that isotope in <Term id="atomic-mass-unit">atomic mass units</Term>: {selected.mass} u. It is close to the mass number but not equal to it.</li>
          <li>
            <strong><Term id="atomic-weight">Standard atomic weight</Term></strong> is an average over the isotopes found in nature, weighted by abundance.
            {average !== null && element.atomicMass.kind === 'standard' ? (
              <>
                {' '}For {element.name}, the abundances above give <strong>{Number(average.toPrecision(7))} u</strong>; the CIAAW standard atomic weight is <strong>{element.atomicMass.value} u</strong>.
                {element.atomicMass.uncertainty === null && (
                  <span className="mt-1 block text-muted">
                    IUPAC publishes a range for {element.name} because its isotopic composition varies in nature (for example between rocks and
                    water). The value shown is the conventional point in that range, so it can differ slightly from the average computed here.
                  </span>
                )}
              </>
            ) : (
              <> {element.name} has no standard atomic weight because it has no characteristic natural mixture of isotopes to average, so tables show the mass number of a long-lived isotope in brackets instead.</>
            )}
          </li>
        </ul>
      </details>
    </div>
  )
}
