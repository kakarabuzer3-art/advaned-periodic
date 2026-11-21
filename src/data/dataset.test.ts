import { describe, expect, it } from 'vitest'
import { CANONICAL_ELEMENTS, NO_STANDARD_ATOMIC_WEIGHT, hasNoStableIsotope } from '../domain/canonical.ts'
import { CATEGORY_IDS, type CategoryId } from '../domain/classification.ts'
import { DatasetSchema } from '../domain/schema.ts'
import raw from './elements.json'
import { datasetMeta, elements, getElementBySymbol } from './index.ts'

const NOBLE_CORE_Z: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 }

function parseConfig(cfg: string): { n: number; electrons: number }[] {
  return cfg
    .trim()
    .split(/\s+/)
    .filter((t) => !t.startsWith('['))
    .map((t) => {
      const m = /^(\d)([spdf])(\d+)$/.exec(t)
      if (!m) throw new Error(`Unparseable orbital token "${t}" in "${cfg}"`)
      return { n: Number(m[1]), electrons: Number(m[3]) }
    })
}

describe('dataset identity', () => {
  it('has exactly 118 records numbered 1..118 with no duplicates', () => {
    expect(elements).toHaveLength(118)
    expect(elements.map((e) => e.number)).toEqual(Array.from({ length: 118 }, (_, i) => i + 1))
    expect(new Set(elements.map((e) => e.symbol)).size).toBe(118)
    expect(new Set(elements.map((e) => e.name)).size).toBe(118)
  })

  it('matches the independent canonical symbol/name list', () => {
    elements.forEach((e, i) => {
      expect([e.symbol, e.name]).toEqual(CANONICAL_ELEMENTS[i])
    })
    expect(elements[0]?.symbol).toBe('H')
    expect(elements[117]?.symbol).toBe('Og')
  })

  it('excludes the non-existent element 119 present upstream', () => {
    expect(getElementBySymbol('Uue')).toBeUndefined()
    expect(datasetMeta.droppedRecords.join(' ')).toMatch(/Uue/)
  })

  it('passes the strict schema', () => {
    expect(DatasetSchema.safeParse(raw).success).toBe(true)
  })

  it('records every upstream-vs-app category disagreement openly', () => {
    expect(datasetMeta.categoryDisagreements.map((s) => s.split(':')[0]).sort()).toEqual(['At', 'Nh', 'Ts'])
  })
})

describe('table layout', () => {
  it('gives every element its own cell', () => {
    const cells = new Set(elements.map((e) => `${e.position.row}:${e.position.col}`))
    expect(cells.size).toBe(118)
  })

  it('has the expected number of elements per row', () => {
    const perRow: Record<number, number> = {}
    for (const e of elements) perRow[e.position.row] = (perRow[e.position.row] ?? 0) + 1
    expect(perRow).toEqual({ 1: 2, 2: 8, 3: 8, 4: 18, 5: 18, 6: 17, 7: 17, 9: 15, 10: 15 })
  })

  it.each([
    ['H', 1, 1, 1, 's'],
    ['He', 18, 1, 1, 's'],
    ['Fe', 8, 4, 4, 'd'],
    ['Au', 11, 6, 6, 'd'],
    ['Og', 18, 7, 7, 'p'],
    ['Lu', 3, 6, 9, 'd'],
    ['Lr', 3, 7, 10, 'd'],
  ] as const)('%s has the textbook group/period/row/block', (symbol, group, period, row, block) => {
    const e = getElementBySymbol(symbol)!
    expect({ group: e.group, period: e.period, block: e.block }).toEqual({ group, period: period, block })
    if (symbol === 'Lu' || symbol === 'Lr') expect(e.position.row).toBe(row)
  })

  it('assigns no group to La-Yb and Ac-No', () => {
    for (const e of elements) {
      const f = (e.number >= 57 && e.number <= 70) || (e.number >= 89 && e.number <= 102)
      expect(e.group === null).toBe(f)
      expect(e.block === 'f').toBe(f)
    }
  })

  it('fills the s, p, d and f blocks with the expected counts', () => {
    // s: 7 periods x 2 columns (H, He included, He being s-block by configuration) = 14
    // p: 6 periods x 6 columns (periods 2-7) = 36
    // d: 4 periods x 10 columns = 40 (Lu and Lr count as d-block, group 3)
    // f: 14 + 14 = 28 (La-Yb, Ac-No)
    const count = (b: string) => elements.filter((e) => e.block === b).length
    expect({ s: count('s'), p: count('p'), d: count('d'), f: count('f') }).toEqual({ s: 14, p: 36, d: 40, f: 28 })
  })
})

describe('classification', () => {
  const expected: Record<CategoryId, number> = {
    'alkali-metal': 6,
    'alkaline-earth-metal': 6,
    'transition-metal': 38,
    'post-transition-metal': 12,
    metalloid: 6,
    'reactive-nonmetal': 7,
    halogen: 6,
    'noble-gas': 7,
    lanthanoid: 15,
    actinoid: 15,
  }

  it('uses all ten required categories with the documented membership counts', () => {
    const counts = Object.fromEntries(CATEGORY_IDS.map((id) => [id, elements.filter((e) => e.category === id).length]))
    expect(counts).toEqual(expected)
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(118)
  })

  it('places well-known elements in the right category', () => {
    const cat = (s: string) => getElementBySymbol(s)!.category
    expect([cat('Na'), cat('Ca'), cat('Fe'), cat('Pb'), cat('Si'), cat('O'), cat('Cl'), cat('Ne'), cat('Nd'), cat('U')]).toEqual([
      'alkali-metal', 'alkaline-earth-metal', 'transition-metal', 'post-transition-metal', 'metalloid',
      'reactive-nonmetal', 'halogen', 'noble-gas', 'lanthanoid', 'actinoid',
    ])
  })

  it('flags elements from Mt upward as predicted and explains disputed placements', () => {
    for (const e of elements) expect(e.classificationBasis).toBe(e.number >= 109 ? 'predicted' : 'established')
    for (const s of ['H', 'Lu', 'Lr', 'At', 'Ts', 'Og']) expect(getElementBySymbol(s)?.classificationNote).toBeTruthy()
  })
})

describe('physical consistency of the data', () => {
  it('has electron configurations whose total electrons equal Z', () => {
    for (const e of elements) {
      const total = parseConfig(e.electronConfiguration).reduce((a, t) => a + t.electrons, 0)
      expect(total, `${e.symbol} full configuration`).toBe(e.number)
    }
  })

  it('has short configurations (noble-gas core + valence) that also total Z', () => {
    for (const e of elements) {
      const core = /^\[(\w+)\]/.exec(e.electronConfigurationShort)?.[1]
      const coreZ = core ? NOBLE_CORE_Z[core] : 0
      expect(coreZ, `${e.symbol} unknown core`).not.toBeUndefined()
      const valence = parseConfig(e.electronConfigurationShort).reduce((a, t) => a + t.electrons, 0)
      expect(coreZ! + valence, `${e.symbol} short configuration`).toBe(e.number)
    }
  })

  it('has shell occupancy that matches the configuration string, shell by shell', () => {
    for (const e of elements) {
      const byShell: number[] = []
      for (const t of parseConfig(e.electronConfiguration)) byShell[t.n - 1] = (byShell[t.n - 1] ?? 0) + t.electrons
      expect(byShell.map((x) => x ?? 0), `${e.symbol} shells`).toEqual([...e.shells])
    }
  })

  it('has strictly increasing successive ionisation energies and no more than Z of them', () => {
    for (const e of elements) {
      const ie = e.ionizationEnergiesKJPerMol
      expect(ie.length, `${e.symbol} count`).toBeLessThanOrEqual(e.number)
      for (let i = 1; i < ie.length; i++) expect(ie[i]!, `${e.symbol} IE${i + 1}`).toBeGreaterThan(ie[i - 1]!)
    }
  })

  it('gives a phase at 298.15 K that agrees with melting and boiling points', () => {
    const T = 298.15
    for (const e of elements) {
      expect(e.phase, `${e.symbol} phase present`).not.toBeNull()
      if (e.meltingPointK !== null && e.boilingPointK !== null && e.meltingPointK < e.boilingPointK) {
        const expectedPhase = T < e.meltingPointK ? 'Solid' : T >= e.boilingPointK ? 'Gas' : 'Liquid'
        expect(e.phase, e.symbol).toBe(expectedPhase)
      }
    }
    expect(['Br', 'Hg'].map((s) => getElementBySymbol(s)?.phase)).toEqual(['Liquid', 'Liquid'])
    expect(elements.filter((e) => e.phase === 'Gas').map((e) => e.symbol)).toEqual(
      ['H', 'He', 'N', 'O', 'F', 'Ne', 'Cl', 'Ar', 'Kr', 'Xe', 'Rn'],
    )
  })

  it('uses mass-number notation exactly where IUPAC gives no standard atomic weight', () => {
    for (const e of elements) {
      const expectedKind = NO_STANDARD_ATOMIC_WEIGHT.has(e.number) ? 'massNumber' : 'standard'
      expect(e.atomicMass.kind, e.symbol).toBe(expectedKind)
      if (expectedKind === 'massNumber') expect(Number.isInteger(e.atomicMass.value)).toBe(true)
    }
    expect(NO_STANDARD_ATOMIC_WEIGHT.size).toBe(34)
    // Th, Pa and U do have standard atomic weights.
    expect(['Th', 'Pa', 'U'].map((s) => getElementBySymbol(s)?.atomicMass.kind)).toEqual(['standard', 'standard', 'standard'])
  })

  it('has atomic weights rising with Z up to Bi, except the three well-known inversions', () => {
    const inversions: string[] = []
    for (let i = 1; i < 83; i++) {
      if (elements[i]!.atomicMass.value < elements[i - 1]!.atomicMass.value) {
        inversions.push(`${elements[i - 1]!.symbol}>${elements[i]!.symbol}`)
      }
    }
    // Tc (43) and Pm (61) are mass numbers, which can legitimately sit below neighbours' averages; none do here.
    expect(inversions).toEqual(['Ar>K', 'Co>Ni', 'Te>I'])
  })

  it('has positive, finite numeric properties', () => {
    for (const e of elements) {
      for (const v of [e.meltingPointK, e.boilingPointK, e.molarHeatJPerMolK, e.density?.value ?? null]) {
        if (v !== null) expect(v, `${e.symbol}`).toBeGreaterThan(0)
      }
      if (e.electronegativityPauling !== null) {
        expect(e.electronegativityPauling).toBeGreaterThan(0)
        expect(e.electronegativityPauling).toBeLessThan(4.5)
      }
    }
  })

  it('flags the heaviest elements honestly', () => {
    for (const e of elements) expect(e.propertiesTheoretical).toBe(e.number >= 100)
    const unconfirmed = elements.filter((e) => !e.electronConfigurationConfirmed).map((e) => e.symbol)
    expect(unconfirmed).toEqual(['Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
    // Derived from the isotope data; must agree with the independent list: Tc, Pm and Z >= 83.
    // (Bi-209 has a measured half-life of 20.1 exayears, so strictly it is radioactive; my earlier hand-written list treated Z=83 as stable.)
    for (const e of elements) expect(e.noStableIsotope, e.symbol).toBe(hasNoStableIsotope(e.number) || e.number === 83)
    expect(elements.filter((e) => e.noStableIsotope)).toHaveLength(38)
  })

  it('carries a source link for every element and corrects scraping artefacts', () => {
    for (const e of elements) expect(e.sourceUrl).toMatch(/^https:\/\//)
    expect(elements.some((e) => /isotopes? of/i.test(e.namedBy ?? ''))).toBe(false)
    expect(datasetMeta.corrections.length).toBe(3)
  })

  it('records provenance and statuses for the important fields', () => {
    const fs = datasetMeta.fieldStatus
    expect(fs.atomicMass).toMatchObject({ sourceId: 'ciaaw', status: 'critically-evaluated' })
    expect(fs.isotopeHalfLifeAndDecay).toMatchObject({ sourceId: 'nubase2020', status: 'critically-evaluated' })
    expect(fs.ionizationEnergy1).toMatchObject({ sourceId: 'nist-asd' })
    // Wikipedia-derived and unsourced text must never be labelled as evaluated.
    expect(fs.oxidationStates?.status).toBe('compiled-secondary')
    expect(fs.uses?.status).toBe('compiled-secondary')
    const ids = new Set(datasetMeta.sources.map((s) => s.id))
    for (const f of Object.values(fs)) expect(ids.has(f.sourceId)).toBe(true)
  })

  it('cross-checks two independent sources and reports the disagreements instead of hiding them', () => {
    const c = datasetMeta.crossChecks
    expect(c.isotopesVsNist.compared).toBe(288)
    expect(c.isotopesVsNist.massDisagreements).toBe(0)
    // Small differences (<= 0.13 percentage points) in Yb, Hf and Ir: different publication editions.
    expect(c.isotopesVsNist.abundanceDisagreements).toHaveLength(10)
    expect(c.isotopesVsNist.abundanceDisagreements.every((s) => /^(Yb|Hf|Ir)-/.test(s))).toBe(true)
    // The reference lists no abundance for uranium; the source has the standard values (U-235 0.7204 %, U-238 99.2742 %). A gap, not a conflict.
    expect(c.isotopesVsNist.referenceHasNoValue.map((s) => s.split(':')[0])).toEqual(['U-234', 'U-235', 'U-238'])
    expect(c.atomicWeightCommunityVsCiaaw).toEqual([])
    expect(c.ionizationEnergy1CommunityVsNist.map((s) => s.split(':')[0]).sort()).toEqual(['Ac', 'Fr', 'Ir', 'Lr', 'Os', 'Ta', 'Tc', 'Th', 'W'])
  })

  it('carries CIAAW atomic weights with uncertainty, and mass numbers only where there is no standard weight', () => {
    const fe = getElementBySymbol('Fe')!
    expect(fe.atomicMass).toEqual({ kind: 'standard', value: 55.845, uncertainty: 0.002 })
    expect(getElementBySymbol('H')!.atomicMass.uncertainty).toBeNull() // conventional value of an IUPAC interval
    expect(getElementBySymbol('Og')!.atomicMass).toEqual({ kind: 'massNumber', value: 294, uncertainty: null })
    expect(getElementBySymbol('Tc')!.atomicMass).toEqual({ kind: 'massNumber', value: 98, uncertainty: null })
  })

  it('uses the NIST FIRST ionisation energy (the neutral atom), not the second', () => {
    // Regression: an earlier query selected He+ -> He2+ (5250 kJ/mol) and labelled it first.
    expect(getElementBySymbol('He')!.ionizationEnergy1!.kJPerMol).toBeCloseTo(2372.3, 0)
    expect(getElementBySymbol('Na')!.ionizationEnergy1!.kJPerMol).toBeCloseTo(495.8, 0)
    expect(getElementBySymbol('Li')!.ionizationEnergy1!.kJPerMol).toBeCloseTo(520.2, 0)
    expect(elements.filter((e) => !e.ionizationEnergy1).map((e) => e.symbol)).toEqual(['Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
  })

  it('has sensible oxidation states and discovery metadata', () => {
    for (const e of elements) {
      for (const n of [...e.oxidationStates.common, ...e.oxidationStates.other]) {
        expect(n, e.symbol).toBeGreaterThanOrEqual(-5)
        expect(n, e.symbol).toBeLessThanOrEqual(9)
      }
      expect(e.discovery.ancient && e.discovery.discoverers !== null, e.symbol).toBe(false)
    }
    expect(getElementBySymbol('Fe')!.oxidationStates.common).toEqual([2, 3])
    expect(getElementBySymbol('F')!.oxidationStates).toEqual({ common: [-1], other: [] })
    expect(getElementBySymbol('Fe')!.discovery.ancient).toBe(true)
  })
})
