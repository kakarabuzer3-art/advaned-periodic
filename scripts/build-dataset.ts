/**
 * Builds src/data/elements.json from the vendored upstream file.
 *
 *   npm run data:build
 *
 * Design rule: identity (symbol, name, period, group, block, grid position,
 * category) comes from our independent domain layer. The upstream file
 * supplies measured/estimated PROPERTIES only. If upstream disagrees with the
 * canonical symbol list, the build fails.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { CANONICAL_ELEMENTS, ELEMENT_COUNT, NO_STANDARD_ATOMIC_WEIGHT, THEORETICAL_FROM_Z } from '../src/domain/canonical.ts'
import { classify } from '../src/domain/classification.ts'
import { blockOf, groupOf, periodOf, positionOf } from '../src/domain/layout.ts'
import { DatasetSchema } from '../src/domain/schema.ts'
import { HALF_LIFE_UNITS, IsotopeFileSchema, stabilityOf, type HalfLifeUnit, type Isotope } from '../src/domain/isotopes.ts'

const RAW_PATH = new URL('../data/raw/PeriodicTableJSON.json', import.meta.url)
const OUT_PATH = new URL('../src/data/elements.json', import.meta.url)
const ISO_OUT_PATH = new URL('../src/data/isotopes.json', import.meta.url)
const MEND_PATH = new URL('../data/raw/mendeleev-extract.json', import.meta.url)
const RETRIEVED = '2026-11-12'

const n = z.number().nullable().optional()
const s = z.string().nullable().optional()
const RawElement = z.object({
  number: z.number().int(),
  symbol: z.string(),
  name: z.string(),
  period: z.number().int(),
  group: z.number().int(),
  block: z.string(),
  xpos: z.number().int(),
  ypos: z.number().int(),
  category: z.string(),
  atomic_mass: z.number(),
  phase: z.string().nullable().optional(),
  appearance: s,
  density: n,
  density_unit: z.string().optional(),
  melt: n,
  boil: n,
  molar_heat: n,
  electronegativity_pauling: n,
  electron_affinity: n,
  ionization_energies: z.array(z.number()).optional(),
  shells: z.array(z.number()),
  electron_configuration: z.string(),
  electron_configuration_semantic: z.string(),
  named_by: s,
  summary: z.string(),
  source: z.string(),
})
const RawFile = z.object({ elements: z.array(RawElement) })

const nn = z.number().nullable()
const MendIsotope = z.object({
  mass_number: z.number().int(), mass: z.number(), mass_uncertainty: nn, abundance: nn, abundance_uncertainty: nn,
  is_radioactive: z.number(), half_life: nn, half_life_unit: z.string().nullable(), half_life_uncertainty: nn, spin: z.string().nullable(),
  decay: z.array(z.object({ mode: z.string(), intensity: nn, observed: z.boolean() })),
})
const MendElement = z.object({
  atomic_number: z.number().int(), symbol: z.string(), name: z.string(),
  atomic_weight: z.number(), atomic_weight_uncertainty: nn, density: nn, thermal_conductivity: nn, en_pauling: nn, electron_affinity: nn,
  discovery_year: z.number().nullable(), discoverers: z.string().nullable(), discovery_location: z.string().nullable(), name_origin: z.string().nullable(),
  uses: z.string().nullable(), sources: z.string().nullable(), abundance_crust: nn, abundance_sea: nn,
  oxidationStates: z.array(z.tuple([z.number().int(), z.string()])),
  ionizationEnergy1: z.object({ ionization_energy: z.number(), uncertainty: nn, is_theoretical: z.number(), is_semi_empirical: z.number() }).nullable(),
  isotopes: z.array(MendIsotope),
})
const MendFile = z.object({
  package: z.object({ name: z.string(), version: z.string() }),
  crossCheck: z.object({
    reference: z.string(), naturallyOccurringIsotopesCompared: z.number(),
    'massDisagreementsOver0.0002u': z.array(z.any()), 'abundanceDisagreementsOver0.02pp': z.array(z.tuple([z.string(), z.number(), z.number(), z.number()])),
    referenceHasNoAbundance: z.array(z.tuple([z.string(), z.number(), z.number(), z.number()])),
  }),
  elements: z.array(MendElement),
})
const mendText = readFileSync(MEND_PATH)
const mendSha256 = createHash('sha256').update(mendText).digest('hex')
const mend = MendFile.parse(JSON.parse(mendText.toString('utf8')))
if (mend.elements.length !== ELEMENT_COUNT) throw new Error(`mendeleev extract has ${mend.elements.length} elements`)

const atomicWeightDisagreements: string[] = []
const ie1Disagreements: string[] = []
const KJ_PER_EV = 96.48533212
const cleanUnc = (u: number | null | undefined): number | null => (u == null || u <= 0 ? null : Number(u.toPrecision(2)))

const rawText = readFileSync(RAW_PATH)
const rawSha256 = createHash('sha256').update(rawText).digest('hex')
const raw = RawFile.parse(JSON.parse(rawText.toString('utf8'))).elements

const droppedRecords = raw
  .filter((r) => r.number > ELEMENT_COUNT)
  .map((r) => `${r.symbol} (Z=${r.number}, ${r.name}): not an officially recognised element`)

const nameOverrides: string[] = []
const categoryDisagreements: string[] = []
const corrections: string[] = []

/** Upstream category text -> our category id, used only to report disagreements. */
function upstreamCategoryToOurs(text: string): string[] {
  const t = text.replace(/^unknown, (but )?(probably|predicted to be)( an?)? /, '')
  const map: Record<string, string[]> = {
    'diatomic nonmetal': ['reactive-nonmetal', 'halogen'],
    'polyatomic nonmetal': ['reactive-nonmetal'],
    'noble gas': ['noble-gas'],
    'alkali metal': ['alkali-metal'],
    'alkaline earth metal': ['alkaline-earth-metal'],
    metalloid: ['metalloid'],
    'post-transition metal': ['post-transition-metal'],
    'transition metal': ['transition-metal'],
    lanthanide: ['lanthanoid'],
    actinide: ['actinoid'],
  }
  return map[t] ?? []
}

// Isotopes are converted first: the stability of an element depends on them.
const isoUnits = new Set(Object.keys(HALF_LIFE_UNITS))
const byZ: Record<string, unknown[]> = {}
for (const me of mend.elements) {
  byZ[String(me.atomic_number)] = me.isotopes.map((i) => {
    if (i.half_life_unit && !isoUnits.has(i.half_life_unit)) throw new Error(`Unknown half-life unit ${i.half_life_unit}`)
    return {
      a: i.mass_number,
      mass: i.mass,
      massUnc: i.mass_uncertainty ?? null,
      abundance: i.abundance ?? null,
      abundanceUnc: i.abundance_uncertainty ?? null,
      radioactive: Boolean(i.is_radioactive),
      halfLife: i.half_life != null && i.half_life_unit ? { value: i.half_life, unit: i.half_life_unit as HalfLifeUnit, unc: i.half_life_uncertainty ?? null } : null,
      decay: i.decay.map((d) => ({ mode: d.mode, intensity: d.intensity ?? null, observed: d.observed })),
      spin: i.spin ?? null,
    }
  })
}

const elements = CANONICAL_ELEMENTS.map(([symbol, name], i) => {
  const z = i + 1
  const r = raw.find((x) => x.number === z)
  if (!r) throw new Error(`Upstream has no record for Z=${z} (${symbol})`)
  if (r.symbol !== symbol) throw new Error(`Z=${z}: upstream symbol "${r.symbol}" != canonical "${symbol}"`)
  if (r.name !== name) nameOverrides.push(`Z=${z} ${symbol}: upstream "${r.name}" -> IUPAC "${name}"`)

  // Independent cross-check: our derived layout vs the upstream file's own coordinates.
  const pos = positionOf(z)
  const layoutProblems: string[] = []
  if (r.xpos !== pos.col) layoutProblems.push(`col ${pos.col} vs upstream ${r.xpos}`)
  if (r.ypos !== pos.row) layoutProblems.push(`row ${pos.row} vs upstream ${r.ypos}`)
  if (r.period !== periodOf(z)) layoutProblems.push(`period ${periodOf(z)} vs upstream ${r.period}`)
  if (r.block !== blockOf(z)) layoutProblems.push(`block ${blockOf(z)} vs upstream ${r.block}`)
  const g = groupOf(z) // upstream reports group 3 for every f-block element; we deliberately report none
  if (g !== null && r.group !== g) layoutProblems.push(`group ${g} vs upstream ${r.group}`)
  if (layoutProblems.length) throw new Error(`${symbol}: layout disagrees with upstream: ${layoutProblems.join('; ')}`)

  const cls = classify(z)
  if (!upstreamCategoryToOurs(r.category).includes(cls.category)) {
    categoryDisagreements.push(`${symbol}: upstream "${r.category}" vs this app "${cls.category}"`)
  }

  const m = mend.elements[i]
  if (!m || m.atomic_number !== z || m.symbol !== symbol) throw new Error(`${symbol}: mendeleev record does not match the canonical list`)

  // Atomic weight: CIAAW values via mendeleev. Elements without a standard atomic weight carry a mass number.
  const noStd = NO_STANDARD_ATOMIC_WEIGHT.has(z)
  let atomicMass: { kind: 'standard' | 'massNumber'; value: number; uncertainty: number | null }
  if (noStd) {
    const mn = Math.round(m.atomic_weight)
    if (Math.abs(m.atomic_weight - mn) > 0.15) throw new Error(`${symbol}: CIAAW value ${m.atomic_weight} is not near a mass number`)
    atomicMass = { kind: 'massNumber', value: mn, uncertainty: null }
  } else {
    atomicMass = { kind: 'standard', value: m.atomic_weight, uncertainty: cleanUnc(m.atomic_weight_uncertainty) }
    if (Math.abs(m.atomic_weight - r.atomic_mass) > Math.max(0.01, 3 * (m.atomic_weight_uncertainty ?? 0))) {
      atomicWeightDisagreements.push(`${symbol}: CIAAW ${m.atomic_weight} vs community ${r.atomic_mass}`)
    }
  }

  const ie = m.ionizationEnergy1
  const ionizationEnergy1 = ie
    ? { eV: ie.ionization_energy, kJPerMol: Number((ie.ionization_energy * KJ_PER_EV).toFixed(2)), uncertaintyEV: ie.uncertainty ?? null,
        basis: (ie.is_theoretical ? 'theoretical' : ie.is_semi_empirical ? 'semi-empirical' : 'measured') as 'measured' | 'semi-empirical' | 'theoretical' }
    : null
  const communityIe1 = r.ionization_energies?.[0]
  if (ionizationEnergy1 && communityIe1 && Math.abs(ionizationEnergy1.kJPerMol - communityIe1) / communityIe1 > 0.01) {
    ie1Disagreements.push(`${symbol}: NIST ${ionizationEnergy1.kJPerMol} vs community ${communityIe1} kJ/mol`)
  }

  const ancient = /known to the ancients/i.test(m.discoverers ?? '')
  const oxCommon = m.oxidationStates.filter(([, c]) => c === 'main').map(([n]) => n).sort((a, b) => a - b)
  const oxOther = m.oxidationStates.filter(([, c]) => c !== 'main').map(([n]) => n).sort((a, b) => a - b)
  const clean = (t: string | null) => (t && t.trim() !== '' ? t.replace(/\s+/g, ' ').trim() : null)

  let namedBy = r.named_by ?? null
  if (namedBy && /^isotopes? of /i.test(namedBy)) {
    corrections.push(`${symbol}: upstream namedBy "${namedBy}" is a scraping artefact (a Wikipedia page title), set to null`)
    namedBy = null
  }

  const phase = r.phase === 'Solid' || r.phase === 'Liquid' || r.phase === 'Gas' ? r.phase : null
  const unit = r.density_unit === 'g/L' ? 'g/L' : 'g/cm3'
  const confirmed = !r.electron_configuration_semantic.includes('*')

  const position = positionOf(z)
  return {
    number: z,
    symbol,
    name,
    period: periodOf(z),
    group: groupOf(z),
    block: blockOf(z),
    position,
    category: cls.category,
    classificationBasis: cls.basis,
    ...(cls.note ? { classificationNote: cls.note } : {}),
    atomicMass,
    phase,
    appearance: r.appearance ?? null,
    density: r.density == null ? null : { value: r.density, unit: unit as 'g/L' | 'g/cm3' },
    meltingPointK: r.melt ?? null,
    boilingPointK: r.boil ?? null,
    molarHeatJPerMolK: r.molar_heat ?? null,
    electronegativityPauling: r.electronegativity_pauling ?? null,
    electronAffinityKJPerMol: r.electron_affinity ?? null,
    ionizationEnergiesKJPerMol: r.ionization_energies ?? [],
    shells: r.shells,
    electronConfiguration: r.electron_configuration,
    electronConfigurationShort: r.electron_configuration_semantic.replace('*', '').trim(),
    electronConfigurationConfirmed: confirmed,
    namedBy,
    discovery: { year: m.discovery_year ?? null, discoverers: ancient ? null : clean(m.discoverers), location: clean(m.discovery_location), ancient },
    nameOrigin: clean(m.name_origin),
    uses: clean(m.uses),
    occurrence: clean(m.sources),
    abundanceCrustMgPerKg: m.abundance_crust ?? null,
    abundanceSeaMgPerL: m.abundance_sea ?? null,
    thermalConductivityWPerMK: m.thermal_conductivity ?? null,
    oxidationStates: { common: oxCommon, other: oxOther },
    ionizationEnergy1,
    summary: r.summary,
    noStableIsotope: !(byZ[String(z)] as Isotope[]).some((x) => stabilityOf(x) === 'stable'),
    propertiesTheoretical: z >= THEORETICAL_FROM_Z,
    sourceUrl: r.source,
  }
})

const dataset = {
  meta: {
    generatedFrom: 'data/raw/PeriodicTableJSON.json (vendored copy)',
    upstreamRepository: 'https://github.com/Bowserinator/Periodic-Table-JSON',
    upstreamLicense:
      'The upstream repository has no LICENSE file. Element summaries are text from Wikipedia (CC BY-SA 4.0). Confirm reuse terms before public release.',
    rawSha256,
    mendeleevSha256: mendSha256,
    retrieved: RETRIEVED,
    sources: [
      { id: 'community', name: 'Periodic-Table-JSON (community compilation, largely from Wikipedia)', version: null, role: 'Melting/boiling points, density, electronegativity, electron affinity, series of ionisation energies, electron configurations, summaries', url: 'https://github.com/Bowserinator/Periodic-Table-JSON' },
      { id: 'mendeleev', name: `mendeleev Python package (data bundle)`, version: mend.package.version, role: 'Compiles the sources below with per-property citations', url: 'https://github.com/lmmentel/mendeleev' },
      { id: 'ciaaw', name: 'CIAAW standard atomic weights (Meija et al. 2016), via mendeleev', version: null, role: 'Standard atomic weights and uncertainties', url: 'https://www.ciaaw.org/atomic-weights.htm' },
      { id: 'iupac-masses', name: 'IUPAC/AME atomic mass evaluation, via mendeleev', version: null, role: 'Isotope masses', url: 'https://www.ciaaw.org/atomic-masses.htm' },
      { id: 'nubase2020', name: 'NUBASE2020 (Kondev et al. 2021), via mendeleev', version: null, role: 'Isotope half-lives, decay modes, spins and natural abundances (evaluated nuclear data)', url: 'https://www.nndc.bnl.gov/nudat3/' },
      { id: 'nist-asd', name: 'NIST Atomic Spectra Database, via mendeleev', version: null, role: 'First ionisation energy', url: 'https://www.nist.gov/pml/atomic-spectra-database' },
      { id: 'wikipedia-ox', name: 'Wikipedia oxidation-state table (2022 revision), via mendeleev', version: null, role: 'Oxidation states', url: 'https://en.wikipedia.org/wiki/Oxidation_state' },
      { id: 'mendeleev-text', name: 'Descriptive text in the mendeleev bundle (original source not stated)', version: null, role: 'Uses, occurrence, name origin, discovery', url: 'https://github.com/lmmentel/mendeleev' },
    ],
    fieldStatus: {
      atomicMass: { sourceId: 'ciaaw', status: 'critically-evaluated', note: 'Conventional values where IUPAC gives an interval. Mass numbers (in brackets) where there is no standard atomic weight.' },
      isotopeMass: { sourceId: 'iupac-masses', status: 'critically-evaluated' },
      isotopeAbundance: { sourceId: 'nubase2020', status: 'critically-evaluated', note: 'Cross-checked against the NIST values in the periodictable package: 10 Yb, Hf and Ir values differ by up to 0.13 percentage points (publication edition); the reference has no value for uranium.' },
      isotopeHalfLifeAndDecay: { sourceId: 'nubase2020', status: 'critically-evaluated', note: 'Some radioactive isotopes have no measured half-life; those show as not established.' },
      ionizationEnergy1: { sourceId: 'nist-asd', status: 'critically-evaluated', note: 'Heaviest elements are theoretical; see the per-element basis.' },
      oxidationStates: { sourceId: 'wikipedia-ox', status: 'compiled-secondary', note: '"Common" is that table\u2019s emphasis, not a rule: copper is commonly +1 and +2.' },
      uses: { sourceId: 'mendeleev-text', status: 'compiled-secondary', note: 'Original source not stated by the package.' },
      occurrence: { sourceId: 'mendeleev-text', status: 'compiled-secondary' },
      physicalProperties: { sourceId: 'community', status: 'compiled-secondary', note: 'From Z=100 these are estimates or predictions.' },
      electronConfiguration: { sourceId: 'community', status: 'compiled-secondary', note: 'Db to Og are marked unconfirmed by the source.' },
    },
    crossChecks: {
      isotopesVsNist: {
        reference: mend.crossCheck.reference,
        compared: mend.crossCheck.naturallyOccurringIsotopesCompared,
        massDisagreements: mend.crossCheck['massDisagreementsOver0.0002u'].length,
        abundanceDisagreements: mend.crossCheck['abundanceDisagreementsOver0.02pp'].map(([sym, a, x, y]) => `${sym}-${a}: ${x} vs ${Number(y.toFixed(3))} %`),
        referenceHasNoValue: mend.crossCheck.referenceHasNoAbundance.map(([sym, a, x]) => `${sym}-${a}: source ${x} %, reference lists none`),
      },
      atomicWeightCommunityVsCiaaw: atomicWeightDisagreements,
      ionizationEnergy1CommunityVsNist: ie1Disagreements,
    },
    droppedRecords,
    nameOverrides,
    categoryDisagreements,
    corrections,
    notes: [
      'This is a secondary, community-maintained compilation (largely from Wikipedia), not IUPAC or NIST data.',
      'Identity (names, symbols, positions, categories) is defined by this app\u2019s own tested rules, not taken from the upstream file.',
      'Gas densities are for 0 \u00b0C and 1 atm; other densities are for solids and liquids. Phase is checked against melting/boiling points at 298.15 K and 1 atm.',
      'Carbon and arsenic sublime at atmospheric pressure; upstream gives triple-point melting points for them.',
      'Standard atomic weights are shown as a single conventional value. IUPAC publishes intervals for some elements.',
      'From Z=100 numeric properties are treated as estimates or predictions. Configurations the source marks with an asterisk are flagged unconfirmed.',
    ],
  },
  elements,
}

const parsed = DatasetSchema.safeParse(dataset)
if (!parsed.success) {
  console.error('Dataset validation FAILED:')
  for (const issue of parsed.error.issues) console.error(` - [${issue.path.join('.')}] ${issue.message}`)
  process.exit(1)
}

writeFileSync(OUT_PATH, JSON.stringify(parsed.data, null, 1) + '\n')

const isoParsed = IsotopeFileSchema.safeParse({
  meta: {
    source: `mendeleev ${mend.package.version} data bundle`,
    massSource: 'IUPAC/AME atomic mass evaluation',
    nuclearDataSource: 'NUBASE2020 (Kondev et al., 2021): half-lives, decay modes, spins, abundances',
    retrieved: RETRIEVED,
    rawSha256: mendSha256,
    note: 'Masses cross-checked against NIST values for 288 naturally occurring isotopes.',
  },
  byZ,
})
if (!isoParsed.success) {
  console.error('Isotope validation FAILED:', isoParsed.error.issues.slice(0, 5))
  process.exit(1)
}
writeFileSync(ISO_OUT_PATH, JSON.stringify(isoParsed.data))
console.log(`Wrote ${Object.values(isoParsed.data.byZ).reduce((n, l) => n + l.length, 0)} isotopes to src/data/isotopes.json`)
console.log(`Atomic weight community-vs-CIAAW disagreements: ${atomicWeightDisagreements.length} ${atomicWeightDisagreements.slice(0, 6).join(' | ')}`)
console.log(`First ionisation energy community-vs-NIST disagreements: ${ie1Disagreements.length} ${ie1Disagreements.slice(0, 8).join(' | ')}`)
console.log('Layout cross-check vs upstream xpos/ypos/period/block/group: all 118 agree')
console.log(`Wrote ${parsed.data.elements.length} elements to src/data/elements.json`)
console.log(`Dropped: ${droppedRecords.join('; ') || 'none'}`)
console.log(`Corrections: ${corrections.join(' | ') || 'none'}`)
console.log(`Name overrides: ${nameOverrides.length} -> ${nameOverrides.join(' | ')}`)
console.log(`Category disagreements (${categoryDisagreements.length}):\n  ${categoryDisagreements.join('\n  ')}`)
