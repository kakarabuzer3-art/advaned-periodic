import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { datasetMeta } from '../../data/index.ts'
import { CATEGORIES } from '../../domain/classification.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { describeDiscovery, formatDensity, formatKelvin, formatNeutrons, missingLabel } from '../../lib/format.ts'
import { Term } from '../learn/Term.tsx'
import { IsotopeExplorer } from './IsotopeExplorer.tsx'

function Predicted() {
  return (
    <span className="ml-2 rounded border border-warn/60 px-1.5 py-px align-middle text-[0.62rem] font-semibold uppercase tracking-wide text-warn">
      Predicted
    </span>
  )
}

function Missing({ el }: { el: ElementRecord }) {
  return <span className="italic text-muted">{missingLabel(el)}</span>
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-x-3 border-b border-line/60 py-1.5 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function Section({ title, children, prose = false }: { title: string; children: ReactNode; prose?: boolean }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {/* <dl> may only contain term/description groups, so free text sections use a plain div. */}
      {prose ? <div>{children}</div> : <dl>{children}</dl>}
    </section>
  )
}

/** Value with a "Predicted" badge when the whole property set for this element is theoretical. */
function Num({ el, value, children }: { el: ElementRecord; value: unknown; children: ReactNode }) {
  if (value === null || value === undefined) return <Missing el={el} />
  return (
    <>
      {children}
      {el.propertiesTheoretical && <Predicted />}
    </>
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : '0')

const STATUS_LABEL: Record<string, string> = {
  'critically-evaluated': 'Critically evaluated',
  'experimentally-established': 'Experimentally established',
  'compiled-secondary': 'Compiled from a secondary source',
  predicted: 'Predicted',
  unknown: 'Unknown',
  'not-applicable': 'Not applicable',
}

interface Props {
  element: ElementRecord
  onClose: () => void
  headingId: string
}

export function DetailPanel({ element: e, onClose, headingId }: Props) {
  const cat = CATEGORIES[e.category]
  const mass = e.atomicMass
  const ie1 = e.ionizationEnergy1
  const communityIe1 = e.ionizationEnergiesKJPerMol[0]
  const sourceName = (id: string) => datasetMeta.sources.find((s) => s.id === id)?.name ?? id

  return (
    <article data-cat={e.category} aria-labelledby={headingId} className="p-4 sm:p-5">
      <header className="flex items-start gap-4">
        <div
          className="grid h-20 w-20 flex-none place-items-center rounded-lg border-t-4 text-4xl font-bold"
          style={{ borderColor: 'var(--cat, #8da2c4)', background: 'color-mix(in oklab, var(--cat, #8da2c4) 20%, var(--color-panel))' }}
          aria-hidden="true"
        >
          {e.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-2xl font-bold leading-tight">{e.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            <Term id="atomic-number">Atomic number</Term> {e.number} &middot; {cat.label}
            {e.classificationBasis === 'predicted' && <Predicted />}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close element details"
          className="grid h-10 w-10 flex-none place-items-center rounded-lg border border-line bg-panel hover:bg-panel-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <p className="mt-3 text-sm text-muted">{cat.description}</p>
      {e.classificationNote && (
        <p className="mt-2 rounded-md border border-warn/40 bg-warn/10 p-2.5 text-xs leading-relaxed">
          <strong className="font-semibold">Classification note: </strong>
          {e.classificationNote}
        </p>
      )}
      {e.propertiesTheoretical && (
        <p className="mt-2 rounded-md border border-warn/40 bg-warn/10 p-2.5 text-xs leading-relaxed">
          <strong className="font-semibold">Limited data: </strong>
          Bulk properties of this element have not been measured. Numeric values below are estimates or theoretical predictions.
        </p>
      )}

      <Section title="Identity">
        <Row label={<Term id="atomic-number">Atomic number</Term>}>{e.number}</Row>
        <Row label="Symbol">{e.symbol}</Row>
        <Row label={mass.kind === 'standard' ? <Term id="atomic-weight">Atomic weight</Term> : <Term id="mass-number">Mass number</Term>}>
          {mass.kind === 'standard' ? (
            <>
              {mass.value} u{mass.uncertainty !== null && <span className="text-muted"> &plusmn; {mass.uncertainty}</span>}
              {mass.uncertainty === null && <span className="ml-2 text-xs text-muted">conventional value</span>}
            </>
          ) : (
            <>
              [{mass.value}]
              <span className="ml-2 text-xs text-muted">
                No standard atomic weight. The bracketed number is the mass number of a long-lived isotope (CIAAW).
              </span>
            </>
          )}
        </Row>
        <Row label={<Term id="period">Period</Term>}>{e.period}</Row>
        <Row label={<Term id="group">Group</Term>}>
          {e.group === null ? <span className="text-muted">None assigned (f-block)</span> : e.group}
        </Row>
        <Row label={<Term id="block">Block</Term>}>{e.block}-block</Row>
      </Section>

      <Section title="Atomic structure">
        <Row label={<Term id="proton">Protons</Term>}>{e.number}</Row>
        <Row label={<Term id="electron">Electrons (neutral)</Term>}>{e.number}</Row>
        <Row label={<Term id="neutron">Neutrons</Term>}>{formatNeutrons(e)}</Row>
        <Row label={<Term id="electron-shell">Shell distribution</Term>}>{e.shells.join(', ')}</Row>
        <Row label={<Term id="electron-configuration">Configuration</Term>}>
          <span className="font-mono text-[0.8rem]">{e.electronConfigurationShort}</span>
          {!e.electronConfigurationConfirmed && <Predicted />}
          <span className="mt-0.5 block font-mono text-xs text-muted">{e.electronConfiguration}</span>
        </Row>
      </Section>

      <Section title="Isotopes" prose>
        <IsotopeExplorer key={e.number} element={e} />
      </Section>

      <Section title="Physical properties">
        <Row label="State at 298 K, 1 atm">
          {e.phase ?? <Missing el={e} />}
          {e.phase && e.propertiesTheoretical && <Predicted />}
        </Row>
        <Row label="Appearance">{e.appearance ?? <Missing el={e} />}</Row>
        <Row label="Density">
          <Num el={e} value={e.density}>{e.density && formatDensity(e.density)}</Num>
          {e.density?.unit === 'g/L' && <span className="ml-2 text-xs text-muted">(gas, at 0 &deg;C and 1 atm)</span>}
        </Row>
        <Row label="Melting point">
          <Num el={e} value={e.meltingPointK}>{e.meltingPointK !== null && formatKelvin(e.meltingPointK)}</Num>
          {(e.number === 6 || e.number === 33) && <span className="ml-2 text-xs text-muted">(sublimes at 1 atm; triple-point value)</span>}
        </Row>
        <Row label="Boiling point">
          <Num el={e} value={e.boilingPointK}>{e.boilingPointK !== null && formatKelvin(e.boilingPointK)}</Num>
        </Row>
        <Row label="Molar heat capacity">
          <Num el={e} value={e.molarHeatJPerMolK}>{e.molarHeatJPerMolK} J/(mol&middot;K)</Num>
        </Row>
        <Row label="Thermal conductivity">
          <Num el={e} value={e.thermalConductivityWPerMK}>{e.thermalConductivityWPerMK} W/(m&middot;K) at 25 &deg;C</Num>
        </Row>
        <Row label="Electrical conductivity"><span className="italic text-muted">Not in dataset yet</span></Row>
      </Section>

      <Section title="Chemical properties">
        <Row label={<Term id="electronegativity">Electronegativity</Term>}>
          <Num el={e} value={e.electronegativityPauling}>{e.electronegativityPauling} (Pauling)</Num>
        </Row>
        <Row label={<><Term id="ionization-energy">1st ionization energy</Term></>}>
          {ie1 ? (
            <>
              {ie1.kJPerMol} kJ/mol <span className="text-muted">({ie1.eV} eV)</span>
              {ie1.basis !== 'measured' && <Predicted />}
              <span className="block text-xs text-muted">NIST Atomic Spectra Database ({ie1.basis})</span>
            </>
          ) : communityIe1 !== undefined ? (
            <>
              {communityIe1} kJ/mol<Predicted />
              <span className="block text-xs text-muted">Theoretical value from the community dataset; no NIST value exists.</span>
            </>
          ) : <Missing el={e} />}
        </Row>
        <Row label="Electron affinity">
          <Num el={e} value={e.electronAffinityKJPerMol}>{e.electronAffinityKJPerMol} kJ/mol</Num>
        </Row>
        <Row label={<Term id="oxidation-state">Oxidation states</Term>}>
          {e.oxidationStates.common.length + e.oxidationStates.other.length === 0 ? (
            <Missing el={e} />
          ) : (
            <>
              {e.oxidationStates.common.length > 0 && <span className="block"><strong>Most common:</strong> {e.oxidationStates.common.map(signed).join(', ')}</span>}
              {e.oxidationStates.other.length > 0 && <span className="block text-muted">Also reported: {e.oxidationStates.other.map(signed).join(', ')}</span>}
              <span className="mt-0.5 block text-xs text-muted">From a Wikipedia-derived table. &ldquo;Most common&rdquo; is that table&rsquo;s emphasis; other states can be just as important.</span>
            </>
          )}
        </Row>
        <Row label="Reactivity and bonding"><span className="italic text-muted">Not in dataset yet</span></Row>
      </Section>

      <Section title="Scientific background">
        <Row label="Discovery">{describeDiscovery(e)}</Row>
        <Row label="Name origin">{e.nameOrigin ?? <Missing el={e} />}</Row>
        <Row label="Named by">{e.namedBy ?? <Missing el={e} />}</Row>
        <Row label="In Earth&rsquo;s crust">
          {e.abundanceCrustMgPerKg !== null ? `${e.abundanceCrustMgPerKg} mg/kg` : <Missing el={e} />}
        </Row>
        <Row label="In seawater">
          {e.abundanceSeaMgPerL !== null ? `${e.abundanceSeaMgPerL} mg/L` : <Missing el={e} />}
        </Row>
      </Section>

      <p className="mt-3 text-sm leading-relaxed">{e.summary}</p>

      <Section title="Where it is found and what it is used for" prose>
        {e.occurrence && <p className="py-1 text-sm leading-relaxed"><strong className="font-semibold">Found: </strong>{e.occurrence}</p>}
        {e.uses && <p className="py-1 text-sm leading-relaxed"><strong className="font-semibold">Uses: </strong>{e.uses}</p>}
        {!e.occurrence && !e.uses && <p className="py-1 text-sm italic text-muted">No source text available for this element.</p>}
        <p className="mt-1 text-xs text-muted">
          Compiled from a secondary source that does not state its own references. Read each use carefully: it may refer to the pure
          element, a compound or an alloy.
        </p>
      </Section>

      <Section title="Safety and handling" prose>
        {e.number === 83 ? (
          <p className="py-1.5 text-sm">
            Bismuth-209, its only natural isotope, is radioactive in principle, but its half-life is more than a billion times the age of the
            universe, so its radioactivity is negligible in practice. Do not handle chemicals without training and supervision.
          </p>
        ) : e.noStableIsotope ? (
          <p className="py-1.5 text-sm">
            All isotopes of this element are radioactive. Radiation and chemical toxicity hazards apply. It must only be handled by trained people
            under regulatory controls.
          </p>
        ) : (
          <p className="py-1.5 text-sm italic text-muted">
            Element-specific safety information has not been added yet. Do not handle or experiment with chemicals without training and proper
            supervision.
          </p>
        )}
      </Section>

      <details className="mt-5 rounded-lg border border-line p-3 text-xs leading-relaxed">
        <summary className="cursor-pointer text-sm font-semibold">Data sources and how far to trust them</summary>
        <ul className="mt-2 space-y-1.5">
          {Object.entries(datasetMeta.fieldStatus).map(([field, f]) => (
            <li key={field}>
              <strong>{field.replace(/([A-Z])/g, ' $1').toLowerCase()}</strong>: {STATUS_LABEL[f.status] ?? f.status}. Source: {sourceName(f.sourceId)}.
              {f.note && <span className="text-muted"> {f.note}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-muted">
          Retrieved {datasetMeta.retrieved}. Predicted values are theoretical, not measured. This app has not been verified element by element against IUPAC or NIST;
          the cross-checks it ran are listed in the repository README.
        </p>
        <p className="mt-2">
          <a className="underline" href={e.sourceUrl} target="_blank" rel="noreferrer noopener">Upstream source page for {e.name}</a>. Summary text is from Wikipedia (CC BY-SA 4.0).
        </p>
      </details>
    </article>
  )
}
